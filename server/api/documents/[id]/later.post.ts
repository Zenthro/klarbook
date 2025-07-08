import { documents } from "~~/server/database/schema"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  await useDrizzle()
    .update(documents)
    .set({ laterAt: new Date(), updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.organisationId, secure.organisationId)))

  return {}
})
