import { AwsClient } from "aws4fetch"

async function fetchItem(key: string): Promise<ArrayBuffer> {
  // Get configuration from environment variables
  const endpoint = process.env.NUXT_S3_ENDPOINT
  const bucket = process.env.NUXT_S3_BUCKET
  const region = process.env.NUXT_S3_REGION || "us-east-1" // Default region if not specified
  const accessKeyId = process.env.NUXT_S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.NUXT_S3_SECRET_ACCESS_KEY

  // Validate required configuration
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing required S3 configuration in environment variables")
  }

  // Create AWS client for signing requests
  const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region,
    service: "s3", // Specify the AWS service as S3
  })

  const url = `${endpoint}/${bucket}/${key}`

  // Sign and send the request
  const signedRequest = await aws.fetch(url)

  if (!signedRequest.ok) {
    throw new Error(`Failed to fetch item: ${signedRequest.status} ${signedRequest.statusText}`)
  }

  return await signedRequest.arrayBuffer()
}

export const storage = {
  fetchItem,
}
