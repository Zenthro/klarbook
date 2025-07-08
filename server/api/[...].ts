export default defineEventHandler((event) => {
  return createError({ statusCode: 404, message: "Not found" })
})
