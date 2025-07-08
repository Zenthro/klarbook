import { documents, organisations } from "../../database/schema"
import { or, eq, ilike, and, desc, asc, sql, isNull, ne } from "drizzle-orm"
import { z } from "zod"

const querySchema = z.object({
  status: z.enum(["unmatched", "matched", "ignore", "error", ""]).optional(),
  search: z.string().optional(),
  direction: z.enum(["incoming", "outgoing", "neither", ""]).optional(),
  type: z.enum(["beleg", "bank-transaction", "bank-account"]).optional(),
  // page: z.coerce.number().min(1).default(1),
  offset: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { status, search, type, offset, limit, direction } = await getValidatedQuery(event, querySchema.parse)

  const [organisation] = await useDrizzle()
    .select()
    .from(organisations)
    .where(eq(organisations.id, secure.organisationId))

  const whereClauses: any = [
    ...(type ? [eq(documents.type, type)] : []),
    ...(status ? [eq(documents.status, status)] : []),
    eq(documents.organisationId, secure.organisationId),
    isNull(documents.deletedAt),
  ]

  // TODO: filter by status, type and search
  // Calculate pagination offset

  // Main query with pagination
  const query = useDrizzle().select().from(documents).limit(limit).offset(offset).$dynamic()

  switch (type) {
    case "bank-transaction":
      query.orderBy(desc(documents.date), asc(documents.id))

      if (search) {
        // search through description using ilike
        whereClauses.push(
          or(
            ilike(documents.description, `%${search}%`),
            ilike(documents.senderName, `%${search}%`),
            ilike(documents.recipientName, `%${search}%`),
          ),
        )
      }

      break
    case "beleg":
      query.orderBy(desc(documents.date), asc(documents.id))

      if (search) {
        // search through description using ilike
        whereClauses.push(
          or(
            ilike(documents.description, `%${search}%`),
            ilike(documents.senderName, `%${search}%`),
            ilike(documents.recipientName, `%${search}%`),
            ilike(documents.number, `%${search}%`),
          ),
        )
      }

      if (direction) {
        if (direction === "incoming") {
          whereClauses.push(eq(documents.recipientName, organisation.name))
        } else if (direction === "outgoing") {
          whereClauses.push(eq(documents.senderName, organisation.name))
        } else if (direction === "neither") {
          whereClauses.push(
            and(ne(documents.senderName, organisation.name), ne(documents.recipientName, organisation.name)),
          )
        }
      }

      break
    default:
      query.orderBy(desc(documents.date), asc(documents.id))

      if (search) {
        // search through description using ilike
        whereClauses.push(ilike(documents.description, `%${search}%`))
      }

      break
  }

  query.where(and(...whereClauses))

  const data = await query

  // Get total count first
  const countQuery = useDrizzle()
    .select({ count: sql`count(*)` })
    .from(documents)
    .where(and(...whereClauses))

  const [{ count }] = await countQuery
  const totalCount = Number(count)

  // Calculate if there are more results
  const hasMore = totalCount > offset + limit

  return {
    data,
    pagination: {
      offset,
      limit,
      total: totalCount,
      hasMore,
    },
  }
})
