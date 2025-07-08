import { documentLinks, documents } from "~~/server/database/schema"
import { eq, ne } from "drizzle-orm"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  // Update document status to ignore
  await useDrizzle()
    .update(documents)
    .set({ status: "ignore", updatedAt: new Date() })
    .where(
      and(ne(documents.status, "matched"), eq(documents.id, id), eq(documents.organisationId, secure.organisationId)),
    )

  return {}
})
