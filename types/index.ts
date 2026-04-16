// Intake conversation
export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface IntakeSession {
  sessionId: string
  agencyId: string
  projectTypeId: string | null
  messages: Message[]
  extractedData: Partial<ExtractionSchema>
  isComplete: boolean
  createdAt: string
}

// What Claude extracts during intake
export interface ExtractionSchema {
  projectType: string | null
  industry: string | null
  deliverables: string[]
  successCriteria: string | null
  timelineExpectation: string | null
  budgetRange: { min: number | null; max: number | null }
  techConstraints: string[]
  integrations: string[]
  stakeholders: string[]
  existingAssets: string | null
  launchDateHard: boolean
  decisionMakerPresent: boolean | null
  riskFlags: string[]
}

// The AI-generated scope document
export interface GeneratedScope {
  executiveSummary: string
  deliverables: Deliverable[]
  milestones: Milestone[]
  outOfScope: string[]
  riskFlags: RiskFlag[]
  assumptions: string[]
  pricingEstimate: {
    low: number
    high: number
    currency: string
    notes: string
    clamped?: boolean
  }
  requiresHumanReview: boolean
  reviewFlags: ReviewFlag[]
  confidence: 'high' | 'medium' | 'low'
  generatedAt: string
}

export interface ReviewFlag {
  id: string
  type: string  // 'pricing' | 'timeline' | 'integration' | 'missing_info' | 'assumption'
  message: string
}

export interface Deliverable {
  id: string
  title: string
  description: string
  phase: string
}

export interface Milestone {
  id: string
  name: string
  duration: string  // e.g. "2 weeks"
  deliverables: string[]  // deliverable ids
  order: number
}

export interface RiskFlag {
  id: string
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
}

// Rich context attached to an intake link — injected into Claude's system prompt
export interface IntakeLinkContext {
  label?: string | null
  clientCompany?: string | null
  clientWebsite?: string | null
  clientIndustry?: string | null
  primaryObjective?: string | null
  successDefinition?: string | null
  budgetContext?: string | null
  timelineContext?: string | null
  stakeholderContext?: string | null
  technicalContext?: string | null
  mustCapture?: string | null
  excludedTopics?: string | null
  agencyInstructions?: string | null
  engagementType?: 'general' | 'template'
}

// Summary of one completed intake iteration — used to build iterative memory
export interface IterativeMemory {
  iterationNumber: number
  conversationSummary: string
  scopeSummary: string | null
  changeLog: string | null
  openQuestions: string[] | null
}

// Agency config (used in prompt composer)
export interface AgencyConfig {
  id: string
  name: string
  tonePreference: string
  standardAssumptions: string[]
  customRiskFlags: string[]
  rateMin: number | null
  rateMax: number | null
  rateCurrency: string
}

export interface ProjectTypeConfig {
  id: string
  name: string
  description: string | null
  extractionSchema: SchemaField[]
  milestonePattern: string[]
  riskFlags: string[]
  pricingContext: string | null
}

export interface SchemaField {
  key: string
  label: string
  type: 'string' | 'string[]' | 'boolean' | 'number' | 'object'
  required: boolean
  probeHint?: string
}
