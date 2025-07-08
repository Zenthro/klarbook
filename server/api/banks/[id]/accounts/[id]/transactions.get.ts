import { documents } from "~~/server/database/schema"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const result = await useDrizzle()
    .select()
    .from(documents)
    .where(and(eq(documents.type, "bank-transaction"), eq(documents.organisationId, documents.organisationId)))
    .limit(100)

  return result
})
