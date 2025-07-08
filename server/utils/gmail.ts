import { useDrizzle } from "~~/server/utils/drizzle"
import { integrations } from "../database/schema"
import { eq, and } from "drizzle-orm"
import { google } from "googleapis"
import { simpleParser } from "mailparser"

interface AccessToken {
  access_token: string
  refresh_token: string
  scope: string
  token_type: string
  expiry_date: number
}

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

// Create OAuth2 client for Gmail API
function createOAuth2Client() {
  const clientId = process.env.NUXT_GMAIL_CLIENT_ID
  const clientSecret = process.env.NUXT_GMAIL_CLIENT_SECRET
  const redirectUri = process.env.NUXT_APP_URL
    ? `${process.env.NUXT_APP_URL}/api/integrations/gmail/redirect`
    : "http://localhost:3000/api/integrations/gmail/redirect"

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

function hasTokenExpired(accessToken: AccessToken): boolean {
  if (!accessToken.expiry_date) return true

  // Check if token is expired or will expire in the next 5 minutes
  const now = Date.now()
  const expiryBuffer = 5 * 60 * 1000 // 5 minutes in milliseconds
  return now > accessToken.expiry_date - expiryBuffer
}

async function refreshToken(oAuth2Client: any, refreshToken: string): Promise<AccessToken> {
  try {
    oAuth2Client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await oAuth2Client.refreshAccessToken()
    return credentials
  } catch (error) {
    console.error("Error refreshing access token:", error)
    throw new Error("Failed to refresh access token")
  }
}

async function accessToken(organisationId: string) {
  try {
    let [integration] = await useDrizzle()
      .select()
      .from(integrations)
      .where(and(eq(integrations.slug, "gmail"), eq(integrations.organisationId, organisationId)))
      .limit(1)

    if (!integration) {
      // Create integration if it doesn't exist
      ;[integration] = await useDrizzle()
        .insert(integrations)
        .values({
          name: "Gmail",
          slug: "gmail",
          data: {},
          organisationId: organisationId,
        })
        .returning()
    }

    // No token yet or token expired
    if (!integration.data.accessToken || hasTokenExpired(integration.data.accessToken)) {
      // If we have a refresh token, try to refresh the access token
      if (integration.data.accessToken?.refresh_token) {
        const oAuth2Client = createOAuth2Client()
        const newAccessToken = await refreshToken(oAuth2Client, integration.data.accessToken.refresh_token)

        const mergedData = {
          ...integration.data,
          accessToken: newAccessToken,
        }

        // Update integration with new access token
        ;[integration] = await useDrizzle()
          .update(integrations)
          .set({
            data: mergedData,
          })
          .where(eq(integrations.id, integration.id))
          .returning()
      } else {
        // No refresh token, need to re-authorize
        return null
      }
    }

    return {
      token: integration.data.accessToken,
      oAuth2Client: () => {
        const oAuth2Client = createOAuth2Client()
        oAuth2Client.setCredentials(integration.data.accessToken)
        return oAuth2Client
      },
    }
  } catch (error) {
    console.error("Failed to get Gmail access token:", error)
    throw new Error("Failed to get Gmail access token")
  }
}

// Save the tokens received from OAuth flow
async function saveTokens(organisationId: string, tokens: AccessToken) {
  try {
    let [integration] = await useDrizzle()
      .select()
      .from(integrations)
      .where(and(eq(integrations.slug, "gmail"), eq(integrations.organisationId, organisationId)))
      .limit(1)

    if (!integration) {
      // Create integration
      ;[integration] = await useDrizzle()
        .insert(integrations)
        .values({
          name: "Gmail",
          slug: "gmail",
          data: { accessToken: tokens },
          organisationId: organisationId,
        })
        .returning()
    } else {
      // Update integration
      const mergedData = {
        ...integration.data,
        accessToken: tokens,
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
    console.error("Error saving Gmail tokens:", error)
    throw new Error("Failed to save Gmail tokens")
  }
}

// Generate OAuth URL
function getAuthUrl() {
  const oAuth2Client = createOAuth2Client()
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    // Force to always get refresh token
    prompt: "consent",
  })
}

// Exchange authorization code for tokens
async function getTokensFromCode(code: string) {
  const oAuth2Client = createOAuth2Client()
  const { tokens } = await oAuth2Client.getToken(code)
  return tokens
}

// Get list of emails with attachments
async function getEmailsWithAttachments(auth: any, options: { maxResults?: number; pageToken?: string } = {}) {
  const gmail = google.gmail({ version: "v1", auth })

  // Search for emails with attachments
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: options.maxResults || 50,
    pageToken: options.pageToken || undefined,
    q: "has:attachment",
  })

  return {
    messages: res.data.messages || [],
    nextPageToken: res.data.nextPageToken,
  }
}

// Get email details
async function getEmailDetails(auth: any, messageId: string) {
  const gmail = google.gmail({ version: "v1", auth })

  const message = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  })

  return message.data
}

// Process email and extract attachments
async function processEmail(auth: any, messageId: string) {
  const gmail = google.gmail({ version: "v1", auth })

  // Get full message with raw content
  const message = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "raw",
  })

  if (!message.data.raw) {
    throw new Error("No raw email data found")
  }

  // Parse email content
  const decoded = Buffer.from(message.data.raw, "base64")
  const parsedEmail = await simpleParser(decoded)

  // Extract attachments
  const attachments = parsedEmail.attachments || []

  return {
    emailId: messageId,
    messageData: message.data,
    parsedData: {
      subject: parsedEmail.subject,
      from: parsedEmail.from?.text,
      to: parsedEmail.to?.text,
      date: parsedEmail.date,
      text: parsedEmail.text,
      html: parsedEmail.html,
    },
    attachments: attachments
      .filter(attachment => attachment && attachment.filename)
      .map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        contentDisposition: attachment.contentDisposition,
        size: attachment.size,
        content: attachment.content, // Buffer with attachment data
      })),
  }
}

export const gmail = {
  getAuthUrl,
  getTokensFromCode,
  saveTokens,
  accessToken,
  emails: {
    listWithAttachments: getEmailsWithAttachments,
    getDetails: getEmailDetails,
    process: processEmail,
  },
}
