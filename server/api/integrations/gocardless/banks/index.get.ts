import { gocardless } from "~~/server/utils/gocardless"
import { z } from "zod"
import { organisations } from "~~/server/database/schema"

const querySchema = z.object({
  search: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { search } = await getValidatedQuery(event, querySchema.parse)

  const { token } = await gocardless.accessToken(secure.organisationId)
  if (!token) throw createError({ statusCode: 401, message: "Unauthorized" })

  // Fetch institutions
  let institutions = await gocardless.institutions.list(token)

  // Filter institutions
  if (search) {
    institutions = institutions.filter((institution) => {
      return institution.name.toLowerCase().includes(search.toLowerCase())
    })
  }

  return institutions
})
