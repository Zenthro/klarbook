import { gmail } from "~~/server/utils/gmail"
import { useDrizzle } from "~~/server/utils/drizzle"
import { cache } from "~~/server/database/schema"
import { eq } from "drizzle-orm"
import { addDays } from "date-fns"

export default defineEventHandler(async (event) => {
  try {
    console.log("Starting Gmail email sync process")

    // Get the user's session to get the organisation ID
    const { secure, user } = await requireUserSession(event)
    if (!secure) {
      console.log("User not authenticated for Gmail sync")
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      })
    }
    console.log(`Authenticated user with organisation ID: ${user.organisationId}`)

    // Get access token and OAuth client
    console.log("Retrieving Gmail access token")
    const auth = await gmail.accessToken(user.organisationId)

    if (!auth) {
      console.log("Gmail authentication needed - no valid token found")
      return {
        needsAuth: true,
      }
    }
    console.log("Gmail access token retrieved successfully")

    const MAX_RESULTS = 200

    // Fetch emails with attachments (limited to 100 for initial sync)
    console.log("Fetching emails with attachments from Gmail API")
    const emails = await gmail.emails.listWithAttachments(auth.oAuth2Client(), { maxResults: MAX_RESULTS })
    console.log(`Found ${emails.messages?.length || 0} emails with attachments`)

    // Track progress
    const totalEmails = emails.messages?.length || 0
    const processedEmails = []
    const failedEmails = []

    // Process each email
    for (const email of emails.messages) {
      try {
        console.log(`Processing email ID: ${email.id}`)

        // Check if email is already processed using the cache table
        const cacheKey = `gmail-processed-${user.organisationId}-${email.id}`
        console.log(`Checking cache with key: ${cacheKey}`)
        const [cached] = await useDrizzle().select().from(cache).where(eq(cache.key, cacheKey)).limit(1)

        if (cached && cached.value) {
          console.log(`Email ${email.id} already processed, skipping`)
          // Skip already processed emails
          processedEmails.push({
            id: email.id,
            status: "already_processed",
            documents: cached.value,
          })
          continue
        }
        console.log(`Email ${email.id} not found in cache, processing...`)

        // Process email and extract attachments
        console.log(`Fetching and parsing email content for ID: ${email.id}`)
        const processedEmail = await gmail.emails.process(auth.oAuth2Client(), email.id)
        console.log(`Email subject: "${processedEmail.parsedData.subject}"`)
        console.log(`Email has ${processedEmail.attachments?.length || 0} attachments`)

        // Only continue if we have PDF attachments
        const pdfAttachments =
          processedEmail.attachments?.filter((attachment) => {
            const isPdf = attachment?.filename?.toLowerCase?.()?.endsWith(".pdf") || false
            if (isPdf) {
              console.log(`Found PDF attachment: ${attachment.filename}`)
            }
            return isPdf
          }) || []

        console.log(`Email has ${pdfAttachments.length} PDF attachments`)

        if (pdfAttachments.length === 0) {
          // No PDF attachments to process
          console.log(`Email ${email.id} has no PDF attachments, marking as processed`)
          processedEmails.push({
            id: email.id,
            status: "no_pdf_attachments",
          })

          // Store in cache to avoid reprocessing
          console.log(`Storing empty result in cache for email ${email.id}`)
          await useDrizzle()
            .insert(cache)
            .values({
              key: cacheKey,
              value: [],
              expiresAt: addDays(new Date(), 30), // Cache for 30 days
            })
            .onConflictDoUpdate({
              target: cache.key,
              set: {
                value: [],
                expiresAt: addDays(new Date(), 30),
              },
            })

          continue
        }

        // Process this email using the dedicated endpoint
        console.log(`Processing email ${email.id} with dedicated endpoint`)
        const response = await fetch(`${process.env.NUXT_APP_URL}/api/integrations/gmail/emails/${email.id}/process`, {
          method: "POST",
          headers: {
            Cookie: event.headers.get("cookie") || "", // Pass the session cookie for authentication
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to process email ${email.id}: ${errorText}`)
          throw new Error(`Failed to process email: ${errorText}`)
        }

        const result = await response.json()
        console.log(`Successfully processed email ${email.id}, created ${result.documents?.length || 0} documents`)

        processedEmails.push({
          id: email.id,
          status: "processed",
          documents: result.documents,
        })
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error)
        failedEmails.push({
          id: email.id,
          error: (error as Error).message,
        })
      }

      // Log progress
      console.log(`Progress: ${processedEmails.length + failedEmails.length}/${totalEmails} emails processed`)
    }

    console.log(`Gmail sync completed. Processed: ${processedEmails.length}, Failed: ${failedEmails.length}`)
    return {
      success: true,
      total: totalEmails,
      processed: processedEmails.length,
      failed: failedEmails.length,
      details: {
        processed: processedEmails,
        failed: failedEmails,
      },
    }
  } catch (error) {
    console.error("Error syncing Gmail emails:", error)
    throw createError({
      statusCode: 500,
      message: "Failed to sync emails",
    })
  }
})
