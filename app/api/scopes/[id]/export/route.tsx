import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { renderToBuffer } from '@react-pdf/renderer'
import { ScopeDocument } from '@/lib/pdf'
import { getSupabaseAdmin, SCOPE_PDFS_BUCKET } from '@/lib/supabase'
import type { GeneratedScope } from '@/types'
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

  const buffer = await renderToBuffer(
    <ScopeDocument
      scope={scope.generatedScope as GeneratedScope}
      agencyName={agency.name}
      clientName={scope.clientName ?? 'Client'}
    />
  )

  const filename = `${agency.id}/scope-${scope.id}-${Date.now()}.pdf`

  const supabase = getSupabaseAdmin()

  const { error } = await supabase.storage
    .from(SCOPE_PDFS_BUCKET)
    .upload(filename, buffer, { contentType: 'application/pdf', upsert: true })

  if (error) {
    console.error('[export] Supabase upload error', error)
    return NextResponse.json({ error: 'PDF upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from(SCOPE_PDFS_BUCKET)
    .getPublicUrl(filename)

  await db
    .update(scopes)
    .set({ pdfUrl: publicUrl, updatedAt: new Date() })
    .where(eq(scopes.id, id))

  return NextResponse.json({ url: publicUrl })
}
