import { gmail } from "~~/server/utils/gmail"

export default defineEventHandler(async (event) => {
  try {
    // Get the user's session to get the organisation ID
    const { secure, user } = await requireUserSession(event)
    if (!secure) {
      throw createError({
        statusCode: 401, 
        message: "Unauthorized"
      })
    }
    
    // Get query parameters
    const query = getQuery(event)
    const maxResults = query.maxResults ? parseInt(query.maxResults as string) : 50
    const pageToken = query.pageToken as string
    
    // Get access token and OAuth client
    const auth = await gmail.accessToken(user.organisationId)
    
    if (!auth) {
      return {
        needsAuth: true,
      }
    }
    
    // Get emails with attachments
    const emails = await gmail.emails.listWithAttachments(
      auth.oAuth2Client(), 
      { 
        maxResults, 
        pageToken
      }
    )
    
    return {
      emails: emails.messages,
      nextPageToken: emails.nextPageToken,
    }
  } catch (error) {
    console.error("Error fetching Gmail emails:", error)
    throw createError({
      statusCode: 500,
      message: "Failed to fetch emails",
    })
  }
})