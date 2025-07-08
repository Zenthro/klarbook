import { gmail } from "~~/server/utils/gmail"
import { nanoid } from "nanoid"
import { formatISO, addDays } from "date-fns"
import { useS3Storage } from "~~/server/utils/storage"
import { useDrizzle } from "~~/server/utils/drizzle"
import { cache } from "~~/server/database/schema"
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  try {
    console.log(`Gmail processing email: ${event.context.params?.id}`)

    // Get the user's session to get the organisation ID
    const { secure, user } = await requireUserSession(event)
    if (!secure) {
      console.log("User not authenticated for Gmail email processing")
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      })
    }
    console.log(`Authenticated user with organisation ID: ${user.organisationId}`)

    // Get email ID from URL
    const emailId = event.context.params?.id
    if (!emailId) {
      console.log("Email ID missing in request")
      throw createError({
        statusCode: 400,
        message: "Email ID is required",
      })
    }
    console.log(`Processing email with ID: ${emailId}`)

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

    // Check if email is already processed using the cache table
    const cacheKey = `gmail-processed-${user.organisationId}-${emailId}`
    console.log(`Checking cache with key: ${cacheKey}`)
    const [cached] = await useDrizzle().select().from(cache).where(eq(cache.key, cacheKey)).limit(1)

    if (cached && cached.value) {
      console.log(`Email ${emailId} already processed, returning cached result`)
      return {
        success: true,
        status: "already_processed",
        documents: cached.value,
      }
    }
    console.log(`Email ${emailId} not found in cache, processing...`)

    // Process email and extract attachments
    console.log(`Fetching and parsing email content`)
    const processedEmail = await gmail.emails.process(auth.oAuth2Client(), emailId)
    console.log(`Email subject: "${processedEmail.parsedData.subject}"`)
    console.log(`Email has ${processedEmail.attachments?.length || 0} attachments`)

    // Store documents
    const documents = []

    // Process attachments (specifically PDF attachments)
    const attachments = processedEmail.attachments || []
    console.log(`Processing ${attachments.length} attachments from email`)
    let pdfCount = 0

    for (const attachment of attachments) {
      // Skip undefined attachments or non-PDF attachments
      if (!attachment || !attachment.filename) {
        console.log(`Skipping undefined attachment`)
        continue
      }

      if (!attachment.filename.toLowerCase().endsWith(".pdf")) {
        console.log(`Skipping non-PDF attachment: ${attachment.filename}`)
        continue
      }

      console.log(`Processing PDF attachment: ${attachment.filename}`)
      pdfCount++

      // Generate a unique filename for the attachment
      const fileDate = processedEmail.parsedData.date
        ? formatISO(processedEmail.parsedData.date, { representation: "date" })
        : formatISO(new Date(), { representation: "date" })

      const randomId = nanoid(8)
      const filename = `${fileDate}-${emailId}-${randomId}.pdf`
      console.log(`Generated filename: ${filename}`)

      // Upload the attachment to S3
      console.log(`Uploading attachment to S3 storage`)
      const s3Client = useS3Storage()
      const fileId = nanoid(21)
      await s3Client.setItemRaw(fileId, attachment.content)
      console.log(`Uploaded attachment to S3 with ID: ${fileId}`)

      // Create document entry in the database by submitting a multipart form
      console.log(`Creating document entry in database`)
      const formData = new FormData()

      // Add the PDF file to the form
      const pdfBlob = new Blob([attachment.content], { type: "application/pdf" })
      formData.append("file", pdfBlob, filename)

      // Type is determined in the backend based on mimetype, but we'll include metadata
      const metadata = {
        source: "gmail",
        type: "email", // Request to store as type "email"
        emailId: emailId,
        emailSubject: processedEmail.parsedData.subject,
        emailFrom: processedEmail.parsedData.from,
        emailDate: processedEmail.parsedData.date,
        attachmentFilename: attachment.filename,
      }
      console.log(`Adding metadata:`, metadata)
      formData.append("metadata", JSON.stringify(metadata))

      console.log(`Submitting document to API`)
      const response = await fetch(`${process.env.NUXT_APP_URL}/api/documents`, {
        method: "POST",
        headers: {
          Cookie: event.headers.get("cookie") || "", // Pass the session cookie for authentication
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Failed to create document: ${errorText}`)
        continue
      }

      const document = await response.json()
      console.log(`Document created with ID: ${document.id}`)
      documents.push(document)
    }

    console.log(`Processed ${pdfCount} PDF attachments, created ${documents.length} documents`)

    // Store the processed status in the cache table regardless of whether we found attachments
    console.log(`Storing processed email data in cache: ${cacheKey}`)
    await useDrizzle()
      .insert(cache)
      .values({
        key: cacheKey,
        value: documents,
        expiresAt: addDays(new Date(), 30), // Cache for 30 days
      })
      .onConflictDoUpdate({
        target: cache.key,
        set: {
          value: documents,
          expiresAt: addDays(new Date(), 30),
        },
      })
    console.log(`Successfully cached processed email data`)

    return {
      success: true,
      documents,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error processing Gmail email ${event.context.params?.id}:`, error)
    console.error(`Error details: ${errorMessage}`)
    console.error(`Error stack: ${error instanceof Error ? error.stack : "No stack trace available"}`)

    throw createError({
      statusCode: 500,
      message: `Failed to process email: ${errorMessage}`,
    })
  }
})
