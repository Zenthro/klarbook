import { uuidv7 } from "uuidv7"
import { banks } from "~~/server/database/schema"
import { eq, and } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const bankId = getRouterParam(event, "id")
  if (!bankId) throw createError({ statusCode: 400, message: "Invalid bank id" })

  const body = await readBody(event)
  const isReconnect = !!body?.reconnect

  const { token } = await gocardless.accessToken(secure.organisationId)
  if (!token) throw createError({ statusCode: 401, message: "Unauthorized" })

  // Fetch institutions
  let institutions = await gocardless.institutions.list(token)

  const institution = institutions.find((institution) => institution.id === bankId)
  if (!institution) throw createError({ statusCode: 400, message: "Invalid bank id" })

  // 0. reference
  const reference = uuidv7()

  // 1. agreement
  const agreement = await gocardless.agreements.create(token, bankId)

  // 2. requisition
  const requisition = await gocardless.requisitions.create(token, bankId, agreement.id, reference)

  if (isReconnect) {
    // Update existing bank with new requisition and agreement
    const [bank] = await useDrizzle()
      .update(banks)
      .set({
        reference,
        agreementId: agreement.id,
        requisitionId: requisition.id,
      })
      .where(and(
        eq(banks.externalId, bankId),
        eq(banks.organisationId, secure.organisationId)
      ))
      .returning()
    
    if (!bank) {
      throw createError({ statusCode: 404, message: "Bank not found" })
    }

    return {
      link: requisition.link,
    }
  }

  // Insert new bank
  const [bank] = await useDrizzle()
    .insert(banks)
    .values({
      name: institution.name,
      bic: institution.bic,
      logo: institution.logo,
      //
      reference: reference,
      externalId: institution.id,
      agreementId: agreement.id,
      requisitionId: requisition.id,
      //
      organisationId: secure.organisationId,
    })
    .returning()

  return {
    link: requisition.link,
  }
})
