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
  clientEmail: text('client_email'),
  clientName: text('client_name'),
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
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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
