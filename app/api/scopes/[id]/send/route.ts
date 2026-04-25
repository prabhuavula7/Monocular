import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeLinks, scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateAndUploadPdf } from '@/lib/pdf-utils'
import { getResend } from '@/lib/resend'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.id, id))
    .limit(1)

  if (!scope || scope.agencyId !== agency.id || !scope.generatedScope) {
    return NextResponse.json({ error: 'Scope not found' }, { status: 404 })
  }

  // Prefer the intake link's clientEmail — it's always current.
  // The scope snapshot can be stale if the link was edited after the scope was created.
  let recipientEmail = scope.clientEmail
  let recipientName = scope.clientName

  if (scope.intakeLinkId) {
    const [link] = await db
      .select({ clientEmail: intakeLinks.clientEmail, clientName: intakeLinks.clientName })
      .from(intakeLinks)
      .where(eq(intakeLinks.id, scope.intakeLinkId))
      .limit(1)

    if (link?.clientEmail) recipientEmail = link.clientEmail
    if (link?.clientName) recipientName = link.clientName

    // Keep the scope in sync if the link has fresher data
    if (link?.clientEmail && link.clientEmail !== scope.clientEmail) {
      await db
        .update(scopes)
        .set({ clientEmail: link.clientEmail, updatedAt: new Date() })
        .where(eq(scopes.id, id))
    }
  }

  if (!recipientEmail) {
    return NextResponse.json({ error: 'No client email on file' }, { status: 400 })
  }

  let pdfUrl: string
  try {
    pdfUrl = await generateAndUploadPdf(scope, agency)
  } catch (err) {
    console.error('[send] PDF generation error', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }

  const clientName = recipientName ?? 'there'

  if (process.env.NODE_ENV === 'development') {
    console.log(`[send] DEV — skipping email. Would send to: ${recipientEmail} | PDF: ${pdfUrl}`)
  } else {
    try {
      const resend = getResend()
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'Monocular <onboarding@resend.dev>',
        to: recipientEmail,
        subject: `Your project scope from ${agency.name} is ready`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;padding:32px 0;">
            <p style="margin:0 0 20px;">Hi ${clientName},</p>
            <p style="margin:0 0 20px;line-height:1.6;color:#374151;">
              ${agency.name} has prepared your project scope for review.
              It covers the key deliverables, milestones, timeline, and investment estimate.
            </p>
            <a href="${pdfUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;margin-bottom:28px;">
              View Scope PDF
            </a>
            <p style="margin:0;line-height:1.6;color:#6b7280;font-size:14px;">
              Please review and reach out if you have any questions.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
            <p style="margin:0;font-size:13px;color:#9ca3af;">${agency.name}</p>
          </div>
        `,
      })
    } catch (err) {
      console.error('[send] Resend error', err)
      return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 })
    }
  }

  await db
    .update(scopes)
    .set({ status: 'sent', updatedAt: new Date() })
    .where(eq(scopes.id, id))

  return NextResponse.json({ ok: true })
}
