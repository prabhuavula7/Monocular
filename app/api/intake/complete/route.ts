import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { agencies, intakeIterations, intakeLinks, intakeSessions, projectTypes, scopes } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { inngest } from '@/inngest/client'
import { runGenerateScope } from '@/lib/run-generate-scope'
import { getResend } from '@/lib/resend'
import type { Message } from '@/types'

/** Deterministic conversation summary from user messages in the transcript */
function buildConversationSummary(messages: Message[]): string {
  const userMessages = messages.filter((m) => m.role === 'user')
  if (userMessages.length === 0) return 'No client responses recorded.'

  return userMessages
    .slice(0, 10)
    .map((m, i) => {
      const text = m.content.length > 250 ? m.content.slice(0, 247) + '...' : m.content
      return `${i + 1}. ${text}`
    })
    .join('\n')
}

/**
 * Builds the display name for a scope.
 * Format: "{ClientCompany} — {Label} v{N}"
 * Each segment degrades gracefully if the field is empty.
 */
function buildScopeName(
  link: { clientCompany?: string | null; clientName?: string | null; label?: string | null },
  iterationNumber: number,
  projectTypeName?: string | null,
): string {
  const client = link.clientCompany || link.clientName || null
  const project = link.label || projectTypeName || null
  const version = `v${iterationNumber}`

  if (client && project) return `${client} — ${project} ${version}`
  if (client) return `${client} ${version}`
  if (project) return `${project} ${version}`
  return `Scope ${version}`
}

/**
 * Sends an internal notification email to all agency admins when a scope is ready.
 * Runs inside after() — failures are logged but never surface to the client.
 */
async function notifyAgency(opts: {
  clerkOrgId: string
  agencyName: string
  scopeName: string
  scopeId: string
  clientName: string | null | undefined
}) {
  if (!process.env.RESEND_API_KEY) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.monocular.so'

  // Get org members from Clerk and find admins
  const clerk = await clerkClient()
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId: opts.clerkOrgId,
    limit: 50,
  })

  const adminEmails = memberships.data
    .filter((m) => m.role === 'org:admin')
    .map((m) => m.publicUserData?.identifier)
    .filter((e): e is string => !!e)

  if (adminEmails.length === 0) return

  const resend = getResend()
  const scopeUrl = `${appUrl}/scopes/${opts.scopeId}`
  const clientLabel = opts.clientName ? ` from ${opts.clientName}` : ''

  await resend.emails.send({
    from: 'Monocular <notifications@monocular.so>',
    to: adminEmails,
    subject: `New intake complete${clientLabel} — ${opts.scopeName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
        <p style="margin:0 0 8px;font-size:14px;color:#666">${opts.agencyName}</p>
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:600">${opts.scopeName}</h2>
        <p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.5">
          A client has completed an intake session. The scope is ready for your review.
        </p>
        <a href="${scopeUrl}"
           style="display:inline-block;background:#f97316;color:#fff;font-size:14px;font-weight:500;
                  padding:10px 20px;border-radius:8px;text-decoration:none">
          Open scope →
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#999">
          Sent by Monocular · <a href="${appUrl}" style="color:#999">app.monocular.so</a>
        </p>
      </div>
    `,
  })
}

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const [session] = await db
    .select()
    .from(intakeSessions)
    .where(eq(intakeSessions.token, token))
    .limit(1)

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const [link] = await db
    .select()
    .from(intakeLinks)
    .where(eq(intakeLinks.token, token))
    .limit(1)

  // Idempotency: if an iteration record already exists for this session token, return its scope
  if (link) {
    const [existingIteration] = await db
      .select()
      .from(intakeIterations)
      .where(
        and(
          eq(intakeIterations.intakeLinkId, link.id),
          eq(intakeIterations.sessionToken, token + '-' + (session.iterationNumber ?? 1)),
        )
      )
      .limit(1)

    if (existingIteration?.scopeId) {
      return NextResponse.json({ scopeId: existingIteration.scopeId })
    }
  }

  const iterationNumber = session.iterationNumber ?? 1

  // Resolve project type name for scope naming (if template-based link)
  let projectTypeName: string | null = null
  if (session.projectTypeId) {
    const [pt] = await db
      .select({ name: projectTypes.name })
      .from(projectTypes)
      .where(eq(projectTypes.id, session.projectTypeId))
      .limit(1)
    projectTypeName = pt?.name ?? null
  }

  const scopeName = buildScopeName(link ?? {}, iterationNumber, projectTypeName)

  // Create the scope record for this iteration
  const [scope] = await db
    .insert(scopes)
    .values({
      agencyId: session.agencyId,
      intakeLinkId: link?.id,
      projectTypeId: session.projectTypeId ?? null,
      status: 'draft',
      name: scopeName,
      clientName: link?.clientName,
      clientEmail: link?.clientEmail,
      transcript: session.messages as Message[],
      extractedData: session.extractedData,
    })
    .returning()

  // Build conversation summary for iteration history
  const conversationSummary = buildConversationSummary(session.messages as Message[])
  const idempotencyKey = token + '-' + iterationNumber

  // Create the iteration history record
  if (link) {
    await db.insert(intakeIterations).values({
      intakeLinkId: link.id,
      scopeId: scope.id,
      sessionToken: idempotencyKey,
      iterationNumber,
      conversationSummary,
      // scopeSummary is populated by runGenerateScope after generation completes
    })
  }

  // Update link: record last completion time, latest scope, increment iteration count
  // Do NOT set isDeprecated — link stays reusable
  if (link) {
    await db
      .update(intakeLinks)
      .set({
        usedAt: new Date(),
        latestScopeId: scope.id,
        iterationCount: iterationNumber,
      })
      .where(eq(intakeLinks.token, token))
  }

  // Resolve agency for notification
  const [agency] = await db
    .select({ id: agencies.id, name: agencies.name, clerkOrgId: agencies.clerkOrgId })
    .from(agencies)
    .where(eq(agencies.id, session.agencyId))
    .limit(1)

  // Delete session — cleaned up; history lives in intakeIterations
  await db.delete(intakeSessions).where(eq(intakeSessions.token, token))

  // Generate scope + send notification asynchronously after response is sent
  after(async () => {
    // Scope generation
    try {
      await runGenerateScope(scope.id)
    } catch (err) {
      console.error('[generate-scope] inline generation failed', err)
    }

    // Agency notification email
    if (agency) {
      try {
        await notifyAgency({
          clerkOrgId: agency.clerkOrgId,
          agencyName: agency.name,
          scopeName,
          scopeId: scope.id,
          clientName: link?.clientName,
        })
      } catch (err) {
        console.error('[notify-agency] email send failed', err)
      }
    }
  })

  // Fire Inngest as backup if keys are present (production)
  if (process.env.INNGEST_EVENT_KEY) {
    inngest.send({ name: 'scope/generate', data: { scopeId: scope.id } }).catch(() => {})
  }

  return NextResponse.json({ scopeId: scope.id })
}
