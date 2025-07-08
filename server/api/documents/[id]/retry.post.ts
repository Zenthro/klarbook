import { documents } from "~~/server/database/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { documentExtractTask } from "~~/packages/tasks/document/extract"

const paramsSchema = z.object({
  id: z.string(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const params = await getValidatedRouterParams(event, paramsSchema.parse)

  const [result] = await useDrizzle()
    .select()
    .from(documents)
    .where(and(eq(documents.id, params.id), eq(documents.organisationId, secure.organisationId)))
  if (!result) throw createError({ statusCode: 404, message: "Document not found" })

  // await processFile(result)
  await documentExtractTask.trigger({ documentId: result.id, organisationId: secure.organisationId })

  const [updatedDocument] = await useDrizzle()
    .select()
    .from(documents)
    .where(and(eq(documents.id, params.id), eq(documents.organisationId, secure.organisationId)))

  return updatedDocument
})
