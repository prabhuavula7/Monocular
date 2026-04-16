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
  {
    name: 'Mobile App',
    description: 'iOS, Android, or cross-platform mobile application',
    milestonePattern: ['Discovery', 'UX & Design', 'Development', 'Beta Testing', 'App Store Submission', 'Launch'],
    riskFlags: [
      'Cross-platform vs native decision not made',
      'App Store / Play Store review timelines',
      'Push notification or background service complexity',
      'Third-party SDK licensing',
      'Device and OS version support range unclear',
    ],
    extractionSchema: [
      { key: 'platform', label: 'iOS, Android, or cross-platform (React Native / Flutter)', type: 'string', required: true },
      { key: 'coreFeatures', label: 'Core features and user flows', type: 'string[]', required: true },
      { key: 'backendNeeded', label: 'Backend / API required or existing', type: 'string', required: true, probeHint: 'Ask if they need a new backend or if one already exists' },
      { key: 'authMethod', label: 'Authentication method (email, social, biometric)', type: 'string', required: true },
      { key: 'offlineSupport', label: 'Offline functionality required', type: 'boolean', required: false },
      { key: 'pushNotifications', label: 'Push notifications required', type: 'boolean', required: false },
    ],
    pricingContext: 'Mobile app projects typically range $25,000–$150,000+ depending on platform and feature complexity.',
  },
  {
    name: 'SEO & Content Strategy',
    description: 'Search engine optimisation and content marketing programme',
    milestonePattern: ['Audit', 'Strategy', 'Content Plan', 'Execution', 'Reporting'],
    riskFlags: [
      'Existing technical SEO issues not yet resolved',
      'Content production ownership unclear',
      'Highly competitive keyword landscape',
      'Slow site speed impacting rankings',
    ],
    extractionSchema: [
      { key: 'currentTraffic', label: 'Current monthly organic traffic (approximate)', type: 'string', required: false },
      { key: 'targetKeywords', label: 'Priority keywords or topics', type: 'string[]', required: true },
      { key: 'competitors', label: 'Main competitors for keyword research', type: 'string[]', required: true },
      { key: 'contentCapacity', label: 'Who will write content — client or agency', type: 'string', required: true },
      { key: 'cmsPlatform', label: 'CMS platform', type: 'string', required: true },
      { key: 'localSEO', label: 'Local SEO required (geographic targeting)', type: 'boolean', required: false },
    ],
    pricingContext: 'SEO retainers typically range $2,000–$8,000/month. One-off audits and strategies: $3,000–$15,000.',
  },
  {
    name: 'Social Media Management',
    description: 'Ongoing social content creation and community management',
    milestonePattern: ['Onboarding', 'Strategy', 'Content Calendar', 'Execution', 'Monthly Review'],
    riskFlags: [
      'Brand voice guidelines not established',
      'Approval process causing publishing delays',
      'Paid social budget not confirmed',
      'Influencer or UGC requirements',
    ],
    extractionSchema: [
      { key: 'platforms', label: 'Social platforms in scope (Instagram, LinkedIn, TikTok, etc.)', type: 'string[]', required: true },
      { key: 'postFrequency', label: 'Desired posting frequency per platform', type: 'string', required: true },
      { key: 'contentTypes', label: 'Content types (static, Reels, carousels, Stories)', type: 'string[]', required: true },
      { key: 'brandAssets', label: 'Existing brand assets available', type: 'string', required: true },
      { key: 'communityManagement', label: 'Comment and DM management included', type: 'boolean', required: true },
      { key: 'paidSocial', label: 'Paid social / boosting included', type: 'boolean', required: false },
    ],
    pricingContext: 'Social media management retainers typically range $1,500–$6,000/month depending on platforms and content volume.',
  },
  {
    name: 'Video Production',
    description: 'Brand, product, or campaign video production',
    milestonePattern: ['Creative Brief', 'Pre-production', 'Production', 'Post-production', 'Delivery'],
    riskFlags: [
      'Talent / talent releases not confirmed',
      'Location permits required',
      'Music licensing costs',
      'Multiple language versions or subtitles',
      'Tight turnaround for revision cycles',
    ],
    extractionSchema: [
      { key: 'videoType', label: 'Type of video (brand film, product demo, testimonial, ad)', type: 'string', required: true },
      { key: 'duration', label: 'Approximate final video length', type: 'string', required: true },
      { key: 'deliverables', label: 'Deliverable formats and aspect ratios', type: 'string[]', required: true },
      { key: 'talent', label: 'Talent needed — actors, presenters, voice-over', type: 'string', required: false },
      { key: 'location', label: 'Filming location(s)', type: 'string', required: true },
      { key: 'revisionRounds', label: 'Number of edit revision rounds', type: 'string', required: true },
    ],
    pricingContext: 'Video production typically ranges $5,000–$60,000+ depending on production complexity and deliverable count.',
  },
  {
    name: 'UX / UI Redesign',
    description: 'User experience audit and interface redesign for a product or website',
    milestonePattern: ['Research & Audit', 'Information Architecture', 'Wireframes', 'Visual Design', 'Prototype & Handoff'],
    riskFlags: [
      'Development team capacity to implement designs',
      'Design system compatibility with existing codebase',
      'Stakeholder alignment on scope of changes',
      'User research access (recruiting participants)',
    ],
    extractionSchema: [
      { key: 'productType', label: 'Web app, marketing site, or mobile app', type: 'string', required: true },
      { key: 'currentPainPoints', label: 'Known usability issues or pain points', type: 'string[]', required: true },
      { key: 'designSystem', label: 'Existing design system or component library', type: 'string', required: false },
      { key: 'userResearch', label: 'User interviews or testing included', type: 'boolean', required: true },
      { key: 'deliverables', label: 'Deliverables expected (wireframes, prototypes, specs)', type: 'string[]', required: true },
      { key: 'devHandoff', label: 'Developer handoff tool (Figma, Zeplin, etc.)', type: 'string', required: false },
    ],
    pricingContext: 'UX/UI redesign projects typically range $10,000–$60,000 depending on product size and research scope.',
  },
  {
    name: 'SaaS / Product Development',
    description: 'Full-stack build of a software product or internal tool',
    milestonePattern: ['Discovery', 'Architecture', 'MVP Build', 'Beta', 'Launch', 'Iteration'],
    riskFlags: [
      'Third-party API stability and rate limits',
      'Auth and permissions complexity underestimated',
      'Scope creep from changing product requirements',
      'Infrastructure and scaling decisions deferred',
      'Data migration from existing systems',
    ],
    extractionSchema: [
      { key: 'userTypes', label: 'Types of users and their roles', type: 'string[]', required: true },
      { key: 'coreFeatures', label: 'Must-have features for MVP', type: 'string[]', required: true },
      { key: 'techStack', label: 'Preferred or required technology stack', type: 'string', required: false },
      { key: 'integrations', label: 'Required integrations with existing tools', type: 'string[]', required: true },
      { key: 'multiTenant', label: 'Multi-tenant SaaS or single-tenant', type: 'string', required: true },
      { key: 'complianceNeeds', label: 'Compliance requirements (GDPR, HIPAA, SOC 2)', type: 'string[]', required: false, probeHint: 'Critical for scoping — probe explicitly' },
    ],
    pricingContext: 'SaaS and product builds typically range $40,000–$300,000+ for MVP depending on feature scope and compliance needs.',
  },
  {
    name: 'Digital Marketing Campaign',
    description: 'Paid media, email, and conversion-focused campaign',
    milestonePattern: ['Strategy', 'Creative', 'Setup & Launch', 'Optimisation', 'Reporting'],
    riskFlags: [
      'Ad account access or pixel setup delays',
      'Landing page not owned by agency',
      'Budget too small for meaningful testing',
      'CRM or email platform integration complexity',
    ],
    extractionSchema: [
      { key: 'channels', label: 'Campaign channels (Google Ads, Meta, email, etc.)', type: 'string[]', required: true },
      { key: 'budget', label: 'Monthly media budget', type: 'string', required: true },
      { key: 'goal', label: 'Primary campaign goal (leads, sales, awareness)', type: 'string', required: true },
      { key: 'targetAudience', label: 'Target audience description', type: 'string', required: true },
      { key: 'landingPage', label: 'Existing landing page or new build required', type: 'string', required: true },
      { key: 'crmIntegration', label: 'CRM or marketing platform to integrate with', type: 'string', required: false },
    ],
    pricingContext: 'Campaign management retainers typically range $2,500–$10,000/month plus media spend.',
  },
]
