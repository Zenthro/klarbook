import { gmail } from "~~/server/utils/gmail"

export default defineEventHandler(async (event) => {
  // Get the user's session to ensure they're authenticated
  const { secure } = await requireUserSession(event)
  if (!secure) {
    throw createError({
      statusCode: 401, 
      message: "Unauthorized"
    })
  }
  
  // Generate the OAuth URL to redirect the user for authentication
  const authUrl = gmail.getAuthUrl()
  
  return {
    authUrl,
  }
})