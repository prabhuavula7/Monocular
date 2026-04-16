/**
 * Builds the display name for a scope.
 * Format: "{ClientCompany} — {Label} v{N}"
 * Each segment degrades gracefully if the field is empty.
 */
export function buildScopeName(
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
