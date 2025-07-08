import { documentLinks, documents } from "~~/server/database/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
  documentId: z.string(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { id, documentId } = await getValidatedRouterParams(event, paramsSchema.parse)

  // Document N1
  const [document] = await useDrizzle()
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.organisationId, secure.organisationId)))
  if (!document) throw createError({ statusCode: 404, message: "Document not found" })

  // Document N2
  const [document2] = await useDrizzle()
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.organisationId, secure.organisationId)))
  if (!document2) throw createError({ statusCode: 404, message: "Document not found" })

  // Insert a document link between the two documents
  await useDrizzle().insert(documentLinks).values({
    type: "bank-transaction",
    link: document2.id,
    documentId: document.id,
    organisationId: secure.organisationId,
  })

  // Update both documents to status matched
  await useDrizzle()
    .update(documents)
    .set({ status: "matched", updatedAt: new Date() })
    .where(
      and(
        //
        or(eq(documents.id, document.id), eq(documents.id, document2.id)),
        eq(documents.organisationId, secure.organisationId),
      ),
    )

  return {}
})
