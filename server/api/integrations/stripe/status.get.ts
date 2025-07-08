import { stripe } from "~~/server/utils/stripe"

export default defineEventHandler(async (event) => {
  // Get the user's session to ensure they're authenticated
  const { secure } = await requireUserSession(event)
  if (!secure) {
    throw createError({
      statusCode: 401, 
      message: "Unauthorized"
    })
  }
  
  // Check if there's a valid API key
  const auth = await stripe.accessToken(secure.organisationId)
  
  return {
    connected: !!auth?.apiKey
  }
})