import { useDrizzle } from "~~/server/utils/drizzle"
import { integrations } from "../database/schema"
import { eq, and } from "drizzle-orm"
import Stripe from 'stripe'

async function accessToken(organisationId: string) {
  try {
    let [integration] = await useDrizzle()
      .select()
      .from(integrations)
      .where(and(eq(integrations.slug, "stripe"), eq(integrations.organisationId, organisationId)))
      .limit(1)

    if (!integration) {
      // Create integration if it doesn't exist
      ;[integration] = await useDrizzle()
        .insert(integrations)
        .values({
          name: "Stripe",
          slug: "stripe",
          data: {},
          organisationId: organisationId,
        })
        .returning()
    }

    // No API key configured
    if (!integration.data.apiKey) {
      return null
    }

    return {
      apiKey: integration.data.apiKey,
    }
  } catch (error) {
    console.error("Failed to get Stripe API key:", error)
    throw new Error("Failed to get Stripe API key")
  }
}

// Save the API key received from the user
async function saveApiKey(organisationId: string, apiKey: string) {
  try {
    let [integration] = await useDrizzle()
      .select()
      .from(integrations)
      .where(and(eq(integrations.slug, "stripe"), eq(integrations.organisationId, organisationId)))
      .limit(1)

    if (!integration) {
      // Create integration
      ;[integration] = await useDrizzle()
        .insert(integrations)
        .values({
          name: "Stripe",
          slug: "stripe",
          data: { apiKey },
          organisationId: organisationId,
        })
        .returning()
    } else {
      // Update integration
      const mergedData = {
        ...integration.data,
        apiKey,
      }

      ;[integration] = await useDrizzle()
        .update(integrations)
        .set({
          data: mergedData,
        })
        .where(eq(integrations.id, integration.id))
        .returning()
    }

    return integration
  } catch (error) {
    console.error("Error saving Stripe API key:", error)
    throw new Error("Failed to save Stripe API key")
  }
}

// Verify API key is valid
async function verifyApiKey(apiKey: string): Promise<boolean> {
  try {
    const stripe = new Stripe(apiKey)
    await stripe.customers.list({ limit: 1 })
    return true
  } catch (error) {
    console.error("Error verifying Stripe API key:", error)
    return false
  }
}

// Get list of invoices from Stripe
async function getInvoices(apiKey: string, options: { limit?: number } = {}): Promise<any[]> {
  try {
    const stripe = new Stripe(apiKey)
    const invoices = await stripe.invoices.list({
      limit: options.limit || 100,
      status: 'paid',
      expand: ['data.customer'],
    })
    
    return invoices.data
  } catch (error) {
    console.error("Error fetching Stripe invoices:", error)
    throw new Error("Failed to fetch Stripe invoices")
  }
}

// Get invoice PDF
async function getInvoicePDF(apiKey: string, invoiceId: string): Promise<Buffer> {
  try {
    const stripe = new Stripe(apiKey)
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ['customer']
    })
    
    if (!invoice.invoice_pdf) {
      throw new Error("Invoice PDF not available")
    }
    
    // Fetch the PDF
    const response = await fetch(invoice.invoice_pdf)
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`)
    }
    
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer)
  } catch (error) {
    console.error("Error fetching Stripe invoice PDF:", error)
    throw new Error("Failed to fetch Stripe invoice PDF")
  }
}

export const stripe = {
  accessToken,
  saveApiKey,
  verifyApiKey,
  invoices: {
    list: getInvoices,
    getPDF: getInvoicePDF,
  },
}