import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core'

export const scopeStatusEnum = pgEnum('scope_status', [
  'draft',
  'in_review',
  'sent',
  'won',
  'lost',
])

// One row per agency (maps to Clerk organization)
export const agencies = pgTable('agencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkOrgId: text('clerk_org_id').notNull().unique(),
  name: text('name').notNull(),
  tonePreference: text('tone_preference').default('professional'),
  standardAssumptions: text('standard_assumptions').array().default([]),
  customRiskFlags: text('custom_risk_flags').array().default([]),
  rateMin: integer('rate_min'),
  rateMax: integer('rate_max'),
  rateCurrency: text('rate_currency').default('USD'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Project types configured by each agency
export const projectTypes = pgTable('project_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  agencyId: uuid('agency_id')
    .notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  extractionSchema: jsonb('extraction_schema').notNull(), // SchemaField[]
  milestonePattern: text('milestone_pattern').array().notNull(),
  riskFlags: text('risk_flags').array().default([]),
  pricingContext: text('pricing_context'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// Reusable intake links — no expiry by default; deprecated by agency to stop use
export const intakeLinks = pgTable('intake_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  agencyId: uuid('agency_id')
    .notNull()
    .references(() => agencies.id),
  projectTypeId: uuid('project_type_id').references(() => projectTypes.id),
  token: text('token').notNull().unique(),
  // Client identity
  label: text('label'),                        // internal label for the agency
  clientEmail: text('client_email'),
  clientName: text('client_name'),
  clientCompany: text('client_company'),
  clientWebsite: text('client_website'),
  clientIndustry: text('client_industry'),
  // Prompt context fields — injected into Claude's system prompt
  primaryObjective: text('primary_objective'),
  successDefinition: text('success_definition'),
  budgetContext: text('budget_context'),
  timelineContext: text('timeline_context'),
  stakeholderContext: text('stakeholder_context'),
  technicalContext: text('technical_context'),
  mustCapture: text('must_capture'),           // things Claude must make sure to cover
  excludedTopics: text('excluded_topics'),     // topics deliberately out of scope
  agencyInstructions: text('agency_instructions'), // internal steering notes (not shown to client)
  engagementType: text('engagement_type').default('general'), // 'general' | 'template'
  // Iteration tracking
  iterationCount: integer('iteration_count').default(0),
  latestScopeId: text('latest_scope_id'),      // uuid stored as text to avoid circular FK
  expiresAt: timestamp('expires_at'),          // optional — null = never expires
  usedAt: timestamp('used_at'),                // last session completed at
  isDeprecated: boolean('is_deprecated').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

// Ephemeral intake sessions — replaces Redis. Rows expire after 24h.
export const intakeSessions = pgTable('intake_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  agencyId: uuid('agency_id')
    .notNull()
    .references(() => agencies.id),
  projectTypeId: uuid('project_type_id').references(() => projectTypes.id),
  messages: jsonb('messages').notNull().default([]),   // Message[]
  extractedData: jsonb('extracted_data').notNull().default({}),
  isComplete: boolean('is_complete').default(false),
  messageCount: integer('message_count').default(0),
  // Iteration support
  status: text('status').default('active'),    // 'active' | 'awaiting_confirmation' | 'completed'
  iterationNumber: integer('iteration_number').default(1),
  parentScopeId: text('parent_scope_id'),      // most recent prior scope (uuid as text)
  priorIterationSummary: text('prior_iteration_summary'), // compact memory injected into prompt
  completionSummary: text('completion_summary'), // summary generated when this round completes
  clientDecision: text('client_decision'),     // 'continue' | 'modify' | 'complete'
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// History of completed intake iterations per link — drives iterative memory
export const intakeIterations = pgTable('intake_iterations', {
  id: uuid('id').primaryKey().defaultRandom(),
  intakeLinkId: uuid('intake_link_id')
    .notNull()
    .references(() => intakeLinks.id, { onDelete: 'cascade' }),
  scopeId: uuid('scope_id'),                   // scope generated for this iteration
  sessionToken: text('session_token'),          // token of the session that produced this (for idempotency)
  iterationNumber: integer('iteration_number').notNull(),
  conversationSummary: text('conversation_summary').notNull(),
  scopeSummary: text('scope_summary'),         // brief summary of the generated scope
  changeLog: text('change_log'),               // what changed vs prior iteration
  openQuestions: text('open_questions').array(),
  createdAt: timestamp('created_at').defaultNow(),
})

// Completed scopes
export const scopes = pgTable('scopes', {
  id: uuid('id').primaryKey().defaultRandom(),
  agencyId: uuid('agency_id')
    .notNull()
    .references(() => agencies.id),
  intakeLinkId: uuid('intake_link_id').references(() => intakeLinks.id),
  projectTypeId: uuid('project_type_id').references(() => projectTypes.id),
  status: scopeStatusEnum('status').default('draft'),
  name: text('name'),                                                          // computed display name e.g. "Acme Corp — Website v1"
  clientName: text('client_name'),
  clientEmail: text('client_email'),
  transcript: jsonb('transcript').notNull().default([]),  // Message[]
  extractedData: jsonb('extracted_data'),
  generatedScope: jsonb('generated_scope'),               // GeneratedScope
  agencyNotes: text('agency_notes'),
  pdfUrl: text('pdf_url'),
  wonAt: timestamp('won_at'),
  lostAt: timestamp('lost_at'),
  lostReason: text('lost_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  // ML signal fields
  reviewStartedAt: timestamp('review_started_at'),
  approvedAt: timestamp('approved_at'),
  editMagnitude: text('edit_magnitude'),
  priceEstimateGenerated: integer('price_estimate_generated'),
  priceEstimateApproved: integer('price_estimate_approved'),
  actualClosePrice: integer('actual_close_price'),
})
