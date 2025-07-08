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
  
  const body = await readBody(event)
  const apiKey = body.apiKey
  
  if (!apiKey) {
    throw createError({
      statusCode: 400,
      message: "API key is required"
    })
  }
  
  // Verify the API key is valid
  const isValid = await stripe.verifyApiKey(apiKey)
  if (!isValid) {
    throw createError({
      statusCode: 400,
      message: "Invalid API key"
    })
  }
  
  // Save the API key
  await stripe.saveApiKey(secure.organisationId, apiKey)
  
  return {
    success: true
  }
})