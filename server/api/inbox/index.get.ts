import { isNull, ne } from "drizzle-orm"
import { documents, organisations } from "~~/server/database/schema"
import { z } from "zod"

const querySchema = z.object({
  direction: z.enum(["incoming", "outgoing", "neither", ""]).optional(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { direction } = await getValidatedQuery(event, querySchema.parse)

  const [organisation] = await useDrizzle()
    .select({
      id: organisations.id,
      name: organisations.name,
    })
    .from(organisations)
    .where(eq(organisations.id, secure.organisationId))

  function directionClause(): any[] {
    if (direction) {
      if (direction === "incoming") {
        return [eq(documents.recipientName, organisation.name)]
      } else if (direction === "outgoing") {
        return [eq(documents.senderName, organisation.name)]
      } else if (direction === "neither") {
        return [and(ne(documents.senderName, organisation.name), ne(documents.recipientName, organisation.name))]
      } else {
        return []
      }
    } else {
      return []
    }
  }

  const [result] = await useDrizzle()
    .select()
    .from(documents)
    .where(
      and(
        // ne(documents.senderName, organisation.name),
        eq(documents.status, "unmatched"),
        eq(documents.type, "beleg"),
        isNull(documents.deletedAt),
        eq(documents.organisationId, secure.organisationId),
        ...directionClause(),
      ),
    )
    .orderBy(desc(documents.laterAt), desc(documents.date), desc(documents.id))
    .limit(1)

  if (!result)
    return {
      organisation: organisation,
      document: null,
      duplicate: null,
    }

  // find duplicate document (same number)
  const [duplicate] = await useDrizzle()
    .select()
    .from(documents)
    .where(
      and(
        ne(documents.id, result.id),
        eq(documents.type, "beleg"),
        ne(documents.status, "ignore"),
        eq(documents.number, result.number!),
        isNull(documents.deletedAt),
        eq(documents.organisationId, secure.organisationId),
      ),
    )
    .orderBy(desc(documents.date), desc(documents.id))
    .limit(1)

  return {
    organisation: organisation,
    document: result,
    duplicate: duplicate,
  }
})
