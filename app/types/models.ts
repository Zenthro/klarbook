import type { documents, users, documentLinks, documentActions, banks } from "~~/server/database/schema"

export type DUser = typeof users.$inferSelect
export type DBank = typeof banks.$inferSelect
export type DDocument = typeof documents.$inferSelect
export type DDocumentLink = typeof documentLinks.$inferSelect
export type DDocumentAction = typeof documentActions.$inferSelect
