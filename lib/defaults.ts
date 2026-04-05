import type { SchemaField } from '@/types'

interface DefaultProjectType {
  name: string
  description: string
  milestonePattern: string[]
  riskFlags: string[]
  extractionSchema: SchemaField[]
  pricingContext: string
}

export const DEFAULT_PROJECT_TYPES: DefaultProjectType[] = [
  {
    name: 'Web Development',
    description: 'Custom website or web application build',
    milestonePattern: ['Discovery', 'Design', 'Development', 'QA', 'Launch'],
    riskFlags: [
      'Third-party API integrations',
      'CMS content not yet created',
      'Design assets not finalized',
      'Mobile requirements unclear',
    ],
    extractionSchema: [
      { key: 'platform', label: 'Technology stack / platform', type: 'string', required: true, probeHint: 'Ask what framework or CMS if not mentioned' },
      { key: 'pages', label: 'Number of pages or views', type: 'string', required: true },
      { key: 'integrations', label: 'Third-party integrations required', type: 'string[]', required: true, probeHint: 'Probe explicitly: CRM, payments, analytics, APIs' },
      { key: 'designSource', label: 'Design: custom, template, or existing brand', type: 'string', required: true },
      { key: 'contentOwner', label: 'Who provides copy and imagery', type: 'string', required: true },
      { key: 'mobileFirst', label: 'Mobile requirements', type: 'string', required: false },
    ],
    pricingContext: 'Web projects typically range $8,000–$80,000 depending on complexity and integrations.',
  },
  {
    name: 'Brand Identity',
    description: 'Logo, visual identity, and brand guidelines',
    milestonePattern: ['Discovery', 'Concept', 'Refinement', 'Delivery'],
    riskFlags: [
      'Multiple decision-makers or stakeholders',
      'Existing brand guidelines conflict',
      'Unclear competitive positioning',
    ],
    extractionSchema: [
      { key: 'deliverables', label: 'Specific deliverables needed (logo, guidelines, etc.)', type: 'string[]', required: true },
      { key: 'competitors', label: 'Key competitors or brands to reference', type: 'string', required: false },
      { key: 'usageContext', label: 'Where the brand will be used (digital, print, signage)', type: 'string[]', required: true },
      { key: 'revisions', label: 'Expected number of revision rounds', type: 'string', required: false },
    ],
    pricingContext: 'Brand projects typically range $5,000–$30,000.',
  },
  {
    name: 'E-commerce Build',
    description: 'Online store build or migration',
    milestonePattern: ['Discovery', 'Design', 'Development', 'Catalogue Setup', 'QA', 'Launch'],
    riskFlags: [
      'Custom checkout or payment flow',
      'ERP or inventory system integration',
      'Product catalogue size (large = high migration risk)',
      'Multi-currency or multi-region requirements',
      'Existing platform migration',
    ],
    extractionSchema: [
      { key: 'platform', label: 'Preferred platform (Shopify, WooCommerce, custom)', type: 'string', required: true },
      { key: 'productCount', label: 'Approximate number of products / SKUs', type: 'string', required: true },
      { key: 'existingPlatform', label: 'Current platform if migrating', type: 'string', required: false },
      { key: 'paymentGateways', label: 'Payment gateways required', type: 'string[]', required: true },
      { key: 'erpIntegration', label: 'ERP or inventory system integration', type: 'string', required: false, probeHint: 'High-risk item — probe explicitly' },
      { key: 'customCheckout', label: 'Custom checkout requirements', type: 'string', required: false },
    ],
    pricingContext: 'E-commerce projects typically range $12,000–$100,000+ depending on catalogue size and integrations.',
  },
]
