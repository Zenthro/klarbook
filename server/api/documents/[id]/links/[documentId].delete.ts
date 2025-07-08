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

  await useDrizzle().transaction(async (tx) => {
    // Delete the link between the two documents and update the status to unmatched for both documents
    await tx
      .delete(documentLinks)
      .where(
        and(
          eq(documentLinks.link, documentId),
          eq(documentLinks.documentId, id),
          eq(documentLinks.organisationId, secure.organisationId),
        ),
      )

    // Update both documents to status unmatched
    await tx
      .update(documents)
      .set({ status: "unmatched", updatedAt: new Date() })
      .where(
        and(
          or(eq(documents.id, id), eq(documents.id, documentId)),
          eq(documents.organisationId, secure.organisationId),
        ),
      )
  })

  return {}
})
