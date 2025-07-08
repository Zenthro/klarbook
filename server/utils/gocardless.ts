import { useDrizzle } from "~~/server/utils/drizzle"
import { integrations } from "../database/schema"
import { formatISO, subDays } from "date-fns"
import { eq, and } from "drizzle-orm"

interface AccessToken {
  access: string
  access_expires: number
  refresh: string
  refresh_expires: number
}

async function accessTokenNew(): Promise<AccessToken> {
  const res = await fetch("https://bankaccountdata.gocardless.com/api/v2/token/new/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret_id: process.env.NUXT_GOCARDLESS_SECRET_ID!,
      secret_key: process.env.NUXT_GOCARDLESS_SECRET_KEY!,
    }),
  })

  const body = await res.json()

  return body
}

function hasTokenExpired(accessToken: AccessToken) {
  if (!accessToken.access_expires) return true

  const now = Date.now()
  return now > accessToken.access_expires
}

async function accessToken(organisationId: string) {
  try {
    let [integration] = await useDrizzle()
      .select()
      .from(integrations)
      .where(and(eq(integrations.slug, "gocardless"), eq(integrations.organisationId, organisationId)))
      .limit(1)

    if (!integration) {
      // Create integration
      ;[integration] = await useDrizzle()
        .insert(integrations)
        .values({
          name: "GoCardless",
          slug: "gocardless",
          data: {},
          organisationId: organisationId,
        })
        .returning()
    }

    // If there isn't a valid access token, create one
    // Or if the access token is expired, create a new one
    if (!integration.data.accessToken || hasTokenExpired(integration.data.accessToken)) {
      const accessToken = await accessTokenNew()

      const mergedData = {
        ...integration.data,
        accessToken,
      }

      // Update integration
      ;[integration] = await useDrizzle()
        .update(integrations)
        .set({
          data: mergedData,
        })
        .where(eq(integrations.id, integration.id))
        .returning()
    }

    return {
      token: integration.data.accessToken.access,
      refresh: integration.data.accessToken.refresh,
    }
  } catch (error) {
    console.error(error)
    throw new Error("Failed to fetch access token")
  }
}

interface Institution {
  id: string
  name: string
  bic: string
  transaction_total_days: string
  countries: string[]
  logo: string
  max_access_valid_for_days: string
}

async function institutions(accessToken: string, country: string = "de"): Promise<Institution[]> {
  const res = await fetch(`https://bankaccountdata.gocardless.com/api/v2/institutions/?country=${country}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const institutions = await res.json()

  return institutions
}

async function institution(accessToken: string, institutionId: string): Promise<Institution> {
  const res = await fetch(`https://bankaccountdata.gocardless.com/api/v2/institutions/${institutionId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const institution = await res.json()
  return institution
}

async function getAccessValidForDays(accessToken: string, { institutionId }: { institutionId: string }) {
  const item = await institution(accessToken, institutionId)
  return item.max_access_valid_for_days || 30
}

async function getMaxHistoricalDays(accessToken: string, { institutionId }: { institutionId: string }) {
  const item = await institution(accessToken, institutionId)
  return item.transaction_total_days || 30
}

async function agreement(accessToken: string, institutionId: string) {
  try {
    const maxHistoricalDays = await getMaxHistoricalDays(accessToken, { institutionId })
    const accessValidForDays = await getAccessValidForDays(accessToken, { institutionId })

    const res = await fetch(`https://bankaccountdata.gocardless.com/api/v2/agreements/enduser/`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
      body: JSON.stringify({
        institution_id: institutionId,
        max_historical_days: maxHistoricalDays,
        access_valid_for_days: accessValidForDays,
        access_scope: ["balances", "details", "transactions"],
      }),
    })

    // Check if response is OK
    if (!res.ok) {
      const errorText = await res.text()
      console.error(`GoCardless agreement create failed with status ${res.status}:`, errorText)
      throw new Error(`GoCardless API error: ${res.status} ${res.statusText}`)
    }

    const body = await res.json()

    // Validate the response has expected properties
    if (!body || !body.id) {
      console.error("GoCardless agreement missing id property:", body)
      throw new Error("Invalid response from GoCardless: missing agreement id")
    }

    return body
  } catch (error) {
    console.error("Error creating GoCardless agreement:", error)
    throw error
  }
}

async function requisitionCreate(accessToken: string, bankId: string, agreementId: string, reference: string) {
  try {
    const maxHistoricalDays = await getMaxHistoricalDays(accessToken, { institutionId: bankId })
    const accessValidForDays = await getAccessValidForDays(accessToken, { institutionId: bankId })

    // Ensure we have the correct URL format with http/https
    const baseUrl = process.env.NUXT_APP_URL || "http://localhost:3000"
    const redirectUrl = new URL(`/api/integrations/gocardless/requisitions/${reference}/redirect`, baseUrl).toString()

    console.log("Creating requisition with redirect URL:", redirectUrl)

    const res = await fetch(`https://bankaccountdata.gocardless.com/api/v2/requisitions/`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
      body: JSON.stringify({
        redirect: redirectUrl,
        institution_id: bankId,
        reference: reference,
        agreement: agreementId,
        user_language: "DE",
      }),
    })

    // Check if response is OK
    if (!res.ok) {
      const errorText = await res.text()
      console.error(`GoCardless requisition create failed with status ${res.status}:`, errorText)
      throw new Error(`GoCardless API error: ${res.status} ${res.statusText}`)
    }

    const requisition = await res.json()

    // Validate the response has expected properties
    if (!requisition || !requisition.link) {
      console.error("GoCardless requisition missing link property:", requisition)
      throw new Error("Invalid response from GoCardless: missing link")
    }

    return requisition
  } catch (error) {
    console.error("Error creating GoCardless requisition:", error)
    throw error
  }
}

interface Requisition {
  id: string
  status: string
  agreements: string
  accounts: string[]
  reference: string
  link: string
}

async function requisition(accessToken: string, requisitionId: string) {
  const response = await fetch(`https://bankaccountdata.gocardless.com/api/v2/requisitions/${requisitionId}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  })

  const body = await response.json()

  return body
}

interface Account {
  id: string
  created: string
  last_accessed: string
  iban: string
  bban: string
  status: string
  institution_id: string
  owner_name: string
}

async function account(accessToken: string, accountId: string): Promise<Account> {
  const response = await fetch(`https://bankaccountdata.gocardless.com/api/v2/accounts/${accountId}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  })

  const accountDetails = await response.json()

  return accountDetails
}

export type Transaction = {
  transactionAmount: { amount: string; currency: string }
  currencyExchange?: {
    exchangeRate: string
    targetCurrency: string
    sourceCurrency: string
  }[]
  remittanceInformationStructured?: string
  remittanceInformationStructuredArray?: string[]
  remittanceInformationUnstructured?: string
  remittanceInformationUnstructuredArray?: string[]
  proprietaryBankTransactionCode?: string
  entryReference?: string
  transactionId?: string
  internalTransactionId: string
  bookingDate: string
  valueDate?: string
  additionalInformation?: string
  creditorName?: string
  creditorAccount?: { iban?: string }
  debtorName?: string
  debtorAccount?: { iban?: string }
  balanceAfterTransaction?: {
    balanceAmount?: {
      amount: string
    }
  }
}

export type TransactionsResponse = {
  transactions: {
    booked: Transaction[]
    posted: Transaction[]
  }
}

async function transactions({
  accessToken,
  accountId,
  latest = false,
}: {
  accessToken: string
  accountId: string
  latest?: boolean
}): Promise<TransactionsResponse["transactions"]["booked"] | undefined> {
  const requestUrl = new URL(`https://bankaccountdata.gocardless.com/api/v2/accounts/${accountId}/transactions`)

  if (latest) {
    requestUrl.searchParams.set("date_from", formatISO(subDays(new Date(), 7), { representation: "date" }))
  }

  const result = await fetch(requestUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await result.json()

  if (result.status === 429) {
    console.log("Too many requests, try again later")
    return []
  }

  return data.transactions.booked
}

export const gocardless = {
  accessToken,
  institutions: {
    list: institutions,
  },
  agreements: {
    create: agreement,
  },
  requisitions: {
    create: requisitionCreate,
    get: requisition,
  },
  accounts: {
    get: account,
  },
  transactions: {
    list: transactions,
  },
}
