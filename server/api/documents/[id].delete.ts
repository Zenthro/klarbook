import { documents } from "~~/server/database/schema"
import { and, eq, isNull } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const documentId = getRouterParam(event, "id")
  if (!documentId) throw createError({ statusCode: 400, message: "Invalid request body" })

  // Check and soft delete the document in one query
  const result = await useDrizzle()
    .update(documents)
    .set({
      updatedAt: new Date(),
      deletedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.organisationId, secure.organisationId),
        isNull(documents.deletedAt), // Only update if not already deleted
      ),
    )
    .returning()

  // If no document was updated, it either doesn't exist or doesn't belong to the user's organization
  if (result.length === 0) throw createError({ statusCode: 404, message: "Document not found" })

  return {}
})
