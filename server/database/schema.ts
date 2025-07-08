import { relations } from "drizzle-orm"
import { pgTable, timestamp, text, uuid, integer, date, numeric, jsonb, unique, boolean } from "drizzle-orm/pg-core"
import { uuidv7 } from "uuidv7"

// Types
export type UserRole = "admin" | "user"
export type BankTransactionImportStatus = "loading" | "imported" | "error"
export type BankTransactionStatus = "loading" | "ignore" | "unmatched" | "matched" | "error"
export type DocumentStatus = "loading" | "ignore" | "unmatched" | "matched" | "error"
export type DocumentType = "beleg" | "bank-transaction"
export type DocumentLinkType = "bank-account" | "bank-transaction"
export type DocumentActionType = "bank-account" | "bank-transaction"

// Helpers
const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp({ withTimezone: true }),
}

const organisationId = {
  organisationId: uuid()
    .notNull()
    .references(() => organisations.id),
}

// Tables
export const organisations = pgTable("organisations", {
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  documentNextId: integer().notNull().default(1),
  ...timestamps,
})

export const users = pgTable("users", {
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  role: text().$type<UserRole>().notNull().default("user"),
  email: text().notNull().unique(),
  password: text().notNull(),
  resetPasswordToken: text(),
  resetPasswordTokenValidUntil: timestamp({ withTimezone: true }),
  ...organisationId,
  ...timestamps,
})

export const sessions = pgTable("sessions", {
  token: text().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  ...timestamps,
})

export const documents = pgTable("documents", {
  id: uuid().primaryKey().$defaultFn(uuidv7),
  type: text().$type<DocumentType>().notNull(),
  status: text().$type<DocumentStatus>().notNull(),
  documentId: integer().notNull(), // sequential id (scoped to organisation)

  // Invoice
  date: date(),
  senderName: text(),
  recipientName: text(),
  number: text(),
  amount: numeric({ precision: 16, scale: 2 }),
  currency: text(),
  note: text(),

  // Bank transaction
  hash: text().unique(),
  description: text(),
  bankAccountId: uuid().references(() => bankAccounts.id),

  externalId: text(),

  // later
  laterAt: timestamp({ withTimezone: true }),

  // data: jsonb(),

  fileId: uuid(),
  fileHash: text(),
  ...organisationId,
  ...timestamps,
})

export const documentLinks = pgTable(
  "document_links",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    type: text().$type<DocumentLinkType>().notNull(),
    link: uuid()
      .notNull()
      .references(() => documents.id),
    documentId: uuid()
      .notNull()
      .references(() => documents.id),
    documentActionId: uuid().references(() => documentActions.id),
    ...organisationId,
    ...timestamps,
  },
  //  (t) => [index().on(t.documentId, t.link)]
)

export const documentActions = pgTable(
  "document_actions",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    type: text().$type<DocumentActionType>().notNull(),
    link: uuid()
      .notNull()
      .references(() => documents.id),
    relevance: integer().notNull(),
    documentId: uuid()
      .notNull()
      .references(() => documents.id),
    ...organisationId,
    ...timestamps,
  },
  //  (t) => [index().on(t.documentId, t.link)]
)

export const integrations = pgTable(
  "integrations",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    name: text().notNull(),
    slug: text().notNull(),
    data: jsonb().$type<any>().default({}),
    ...organisationId,
    ...timestamps,
  },
  (t) => [unique().on(t.slug, t.organisationId)],
)

export const banks = pgTable("banks", {
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  bic: text().notNull(),
  logo: text().notNull(),
  reference: text().notNull(),
  externalId: text().notNull(),
  agreementId: text().notNull(),
  requisitionId: text().notNull(),
  ...organisationId,
  ...timestamps,
})

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  iban: text().notNull(),
  bankId: uuid()
    .notNull()
    .references(() => banks.id),
  externalId: text().notNull(),
  syncing: boolean().default(false),
  ...organisationId,
  ...timestamps,
})

export const cache = pgTable("cache", {
  key: text().primaryKey(),
  value: jsonb(),
  expiresAt: timestamp({ withTimezone: true }),
})

/****************/
/* RELATIONS    */
/****************/

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  bank: one(banks, {
    fields: [bankAccounts.bankId],
    references: [banks.id],
  }),
  organisation: one(organisations, {
    fields: [bankAccounts.organisationId],
    references: [organisations.id],
  }),
  documents: many(documents),
}))

export const banksRelations = relations(banks, ({ one, many }) => ({
  bankAccounts: many(bankAccounts),
  organisation: one(organisations, {
    fields: [banks.organisationId],
    references: [organisations.id],
  }),
}))

export const organisationsRelations = relations(organisations, ({ many }) => ({
  bankAccounts: many(bankAccounts),
  banks: many(banks),
  documentActions: many(documentActions),
  documentLinks: many(documentLinks),
  documents: many(documents),
  integrations: many(integrations),
  users: many(users),
}))

export const documentActionsRelations = relations(documentActions, ({ one, many }) => ({
  document_link: one(documents, {
    fields: [documentActions.link],
    references: [documents.id],
    relationName: "documentActions_link_documents_id",
  }),
  document_documentId: one(documents, {
    fields: [documentActions.documentId],
    references: [documents.id],
    relationName: "documentActions_documentId_documents_id",
  }),
  organisation: one(organisations, {
    fields: [documentActions.organisationId],
    references: [organisations.id],
  }),
  documentLinks: many(documentLinks),
}))

export const documentsRelations = relations(documents, ({ one, many }) => ({
  links: many(documentLinks, {
    relationName: "documentLinks_documentId_documents_id",
  }),
  references: many(documentLinks, {
    relationName: "documentLinks_link_documents_id",
  }),
  // links: many(documentLinks),
  // documentActions_link: many(documentActions, {
  //   relationName: "documentActions_link_documents_id",
  // }),
  // documentActions_documentId: many(documentActions, {
  //   relationName: "documentActions_documentId_documents_id",
  // }),
  // documentLinks_link: many(documentLinks, {
  //   relationName: "documentLinks_link_documents_id",
  // }),
  // documentLinks_documentId: many(documentLinks, {
  //   relationName: "documentLinks_documentId_documents_id",
  // }),
  organisation: one(organisations, {
    fields: [documents.organisationId],
    references: [organisations.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [documents.bankAccountId],
    references: [bankAccounts.id],
  }),
}))

export const documentLinksRelations = relations(documentLinks, ({ one }) => ({
  // documentLink: one(documents, {
  //   fields: [documentLinks.link],
  //   references: [documents.id],
  //   relationName: "documentLinks_link_documents_id",
  // }),
  link: one(documents, {
    fields: [documentLinks.link],
    references: [documents.id],
    relationName: "documentLinks_link_documents_id",
  }),
  document: one(documents, {
    fields: [documentLinks.documentId],
    references: [documents.id],
    relationName: "documentLinks_documentId_documents_id",
  }),
  // documentAction: one(documentActions, {
  //   fields: [documentLinks.documentActionId],
  //   references: [documentActions.id],
  // }),
  organisation: one(organisations, {
    fields: [documentLinks.organisationId],
    references: [organisations.id],
  }),
}))

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organisation: one(organisations, {
    fields: [integrations.organisationId],
    references: [organisations.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  organisation: one(organisations, {
    fields: [users.organisationId],
    references: [organisations.id],
  }),
}))
