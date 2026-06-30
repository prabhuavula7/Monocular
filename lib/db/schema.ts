import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  boolean,
  pgEnum,
  real,
} from 'drizzle-orm/pg-core'

export const scopeStatusEnum = pgEnum('scope_status', [
  'draft',
  'in_review',
  'sent',
  'won',
  'lost',
])

export const agentRunStatusEnum = pgEnum('agent_run_status', ['running', 'completed', 'aborted'])

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
  // Stripe billing
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: text('plan').default('trial'),           // 'trial' | 'solo' | 'studio' | 'agency'
  planStatus: text('plan_status').default('trialing'), // 'trialing' | 'active' | 'past_due' | 'canceled'
  trialEndsAt: timestamp('trial_ends_at'),
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
  label: text('label'),
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
  mustCapture: text('must_capture'),
  excludedTopics: text('excluded_topics'),
  agencyInstructions: text('agency_instructions'),
  engagementType: text('engagement_type').default('general'), // 'general' | 'template'
  // Iteration tracking
  iterationCount: integer('iteration_count').default(0),
  latestScopeId: text('latest_scope_id'),
  expiresAt: timestamp('expires_at'),
  usedAt: timestamp('used_at'),
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
  status: text('status').default('active'),    // 'active' | 'awaiting_confirmation' | 'completed'
  iterationNumber: integer('iteration_number').default(1),
  parentScopeId: text('parent_scope_id'),
  priorIterationSummary: text('prior_iteration_summary'),
  completionSummary: text('completion_summary'),
  clientDecision: text('client_decision'),
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
  scopeId: uuid('scope_id'),
  sessionToken: text('session_token'),
  iterationNumber: integer('iteration_number').notNull(),
  conversationSummary: text('conversation_summary').notNull(),
  scopeSummary: text('scope_summary'),
  changeLog: text('change_log'),
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
  name: text('name'),
  clientName: text('client_name'),
  clientEmail: text('client_email'),
  transcript: jsonb('transcript').notNull().default([]),  // Message[]
  extractedData: jsonb('extracted_data'),
  generatedScope: jsonb('generated_scope'),               // GeneratedScope
  agencyNotes: text('agency_notes'),
  pdfUrl: text('pdf_url'),
  reviewToken: text('review_token').unique(),
  clientFeedback: text('client_feedback'),
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

// Agent run trace — one row per engine invocation
export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  agencyId: uuid('agency_id').notNull().references(() => agencies.id, { onDelete: 'cascade' }),
  scopeId: uuid('scope_id'),
  sessionToken: text('session_token'),
  vertical: text('vertical').notNull().default('web-dev'),
  mode: text('mode').notNull(), // 'intake' | 'generate'
  status: agentRunStatusEnum('status').default('running'),
  kind: text('kind'), // 'followup' | 'scope_generated' | 'aborted'
  totalInputTokens: integer('total_input_tokens').default(0),
  totalOutputTokens: integer('total_output_tokens').default(0),
  totalSteps: integer('total_steps').default(0),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
})

// One row per model call or tool call within an agent run
export const agentSteps = pgTable('agent_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull().references(() => agentRuns.id, { onDelete: 'cascade' }),
  stepIndex: real('step_index').notNull(),
  type: text('type').notNull(), // 'model_call' | 'tool_call'
  toolName: text('tool_name'),
  input: jsonb('input'),
  output: jsonb('output'),
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at').defaultNow(),
})
