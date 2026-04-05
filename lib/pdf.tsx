import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { GeneratedScope } from '@/types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111',
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 56,
    lineHeight: 1.5,
  },
  // Cover
  coverSection: {
    marginBottom: 48,
    paddingBottom: 24,
    borderBottom: '1px solid #e5e7eb',
  },
  coverLabel: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    marginBottom: 6,
  },
  coverMeta: {
    fontSize: 10,
    color: '#6b7280',
  },
  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: '1px solid #f3f4f6',
  },
  // Text
  bodyText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
  },
  // Table-ish rows
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottom: '1px solid #f9fafb',
  },
  rowLabel: {
    width: '30%',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    paddingRight: 8,
  },
  rowValue: {
    width: '70%',
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
  },
  // Bullet
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bullet: {
    width: 12,
    fontSize: 10,
    color: '#9ca3af',
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
  },
  // Risk severity badge
  badgeHigh: { color: '#dc2626' },
  badgeMedium: { color: '#d97706' },
  badgeLow: { color: '#6b7280' },
  // Pricing
  pricingRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  priceBlock: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 8,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

interface Props {
  scope: GeneratedScope
  agencyName: string
  clientName: string
  date?: string
}

export function ScopeDocument({ scope, agencyName, clientName, date }: Props) {
  const formattedDate = date ?? new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cover */}
        <View style={styles.coverSection}>
          <Text style={styles.coverLabel}>{agencyName}</Text>
          <Text style={styles.coverTitle}>Project Scope</Text>
          <Text style={styles.coverMeta}>
            Prepared for: {clientName} · {formattedDate}
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <Text style={styles.bodyText}>{scope.executiveSummary}</Text>
        </View>

        {/* Deliverables */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deliverables</Text>
          {scope.deliverables.map((d) => (
            <View key={d.id} style={styles.row}>
              <Text style={styles.rowLabel}>{d.title}</Text>
              <Text style={styles.rowValue}>{d.description} ({d.phase})</Text>
            </View>
          ))}
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milestone Timeline</Text>
          {scope.milestones
            .sort((a, b) => a.order - b.order)
            .map((m) => (
              <View key={m.id} style={styles.row}>
                <Text style={styles.rowLabel}>{m.name}</Text>
                <Text style={styles.rowValue}>{m.duration}</Text>
              </View>
            ))}
        </View>

        {/* Out of Scope */}
        {scope.outOfScope.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Out of Scope</Text>
            {scope.outOfScope.map((item, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bullet}>—</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Risk Flags */}
        {scope.riskFlags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risk Flags</Text>
            {scope.riskFlags.map((r) => (
              <View key={r.id} style={styles.row}>
                <Text style={[
                  styles.rowLabel,
                  r.severity === 'high' ? styles.badgeHigh :
                  r.severity === 'medium' ? styles.badgeMedium : styles.badgeLow,
                ]}>
                  {r.severity.toUpperCase()} · {r.title}
                </Text>
                <Text style={styles.rowValue}>{r.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Assumptions */}
        {scope.assumptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assumptions</Text>
            {scope.assumptions.map((a, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Investment Estimate */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investment Estimate</Text>
          <View style={styles.pricingRow}>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>Low estimate</Text>
              <Text style={styles.priceValue}>
                {scope.pricingEstimate.currency} {scope.pricingEstimate.low.toLocaleString()}
              </Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>High estimate</Text>
              <Text style={styles.priceValue}>
                {scope.pricingEstimate.currency} {scope.pricingEstimate.high.toLocaleString()}
              </Text>
            </View>
          </View>
          {scope.pricingEstimate.notes && (
            <Text style={[styles.bodyText, { color: '#6b7280', marginTop: 4 }]}>
              {scope.pricingEstimate.notes}
            </Text>
          )}
          <Text style={[styles.bodyText, { color: '#9ca3af', fontSize: 8, marginTop: 8, fontStyle: 'italic' }]}>
            This is an indicative estimate based on information provided. Final pricing is subject to detailed review.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{agencyName} · {clientName}</Text>
          <Text style={styles.footerText}>Generated by Monocular</Text>
        </View>
      </Page>
    </Document>
  )
}
