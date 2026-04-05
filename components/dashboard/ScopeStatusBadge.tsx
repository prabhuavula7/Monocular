import { Badge } from '@/components/ui/Badge'

type Status = 'draft' | 'in_review' | 'sent' | 'won' | 'lost'

const STATUS_CONFIG: Record<Status, { label: string; variant: 'gray' | 'amber' | 'blue' | 'green' | 'red' }> = {
  draft: { label: 'Draft', variant: 'gray' },
  in_review: { label: 'In Review', variant: 'amber' },
  sent: { label: 'Sent', variant: 'blue' },
  won: { label: 'Won', variant: 'green' },
  lost: { label: 'Lost', variant: 'red' },
}

export function ScopeStatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return <Badge variant={config.variant}>{config.label}</Badge>
}
