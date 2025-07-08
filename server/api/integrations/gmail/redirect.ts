import { gmail } from "~~/server/utils/gmail"

export default defineEventHandler(async (event) => {
  try {
    // Get the authorization code from the query parameters
    const query = getQuery(event)
    const code = query.code as string
    
    if (!code) {
      throw createError({
        statusCode: 400,
        message: "Authorization code missing",
      })
    }
    
    // Get the user's session to get the organisation ID
    const { secure, user } = await requireUserSession(event)
    if (!secure) {
      throw createError({
        statusCode: 401, 
        message: "Unauthorized"
      })
    }

    // Exchange the authorization code for tokens
    const tokens = await gmail.getTokensFromCode(code)
    
    // Save the tokens in the database for this organisation
    await gmail.saveTokens(user.organisationId, tokens)
    
    // Redirect back to Gmail settings page
    return sendRedirect(event, "/settings/integrations/gmail")
  } catch (error) {
    console.error("Error in Gmail OAuth callback:", error)
    
    // Redirect to error page
    return sendRedirect(event, "/settings/integrations/gmail?error=authorization_failed")
  }
})