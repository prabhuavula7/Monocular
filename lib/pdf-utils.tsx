import { renderToBuffer } from '@react-pdf/renderer'
import { ScopeDocument } from '@/lib/pdf'
import { getSupabaseAdmin, SCOPE_PDFS_BUCKET } from '@/lib/supabase'
import { db } from '@/lib/db'
import { scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { GeneratedScope } from '@/types'

export async function generateAndUploadPdf(
  scope: { id: string; generatedScope: unknown; clientName: string | null; agencyId: string },
  agency: { id: string; name: string },
): Promise<string> {
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

  if (error) throw new Error('PDF upload failed')

  const { data: { publicUrl } } = supabase.storage
    .from(SCOPE_PDFS_BUCKET)
    .getPublicUrl(filename)

  await db
    .update(scopes)
    .set({ pdfUrl: publicUrl, updatedAt: new Date() })
    .where(eq(scopes.id, scope.id))

  return publicUrl
}
