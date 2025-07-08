import tailwindcss from "@tailwindcss/vite"

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  css: ["~/assets/css/app.css"],

  compatibilityDate: "2025-03-15",
  future: { compatibilityVersion: 4 },
  fonts: { experimental: { processCSSVariables: true } },
  ssr: false,

  vite: { plugins: [tailwindcss()] },

  runtimeConfig: {
    // Hetzner Storage credentials
    s3AccessKeyId: process.env.NUXT_S3_ACCESS_KEY_ID,
    s3SecretAccessKey: process.env.NUXT_S3_SECRET_ACCESS_KEY,
    s3Endpoint: process.env.NUXT_S3_ENDPOINT,
    s3Bucket: process.env.NUXT_S3_BUCKET,
    s3Region: process.env.NUXT_S3_REGION,

    // GoCardless credentials
    gocardlessSecretId: "",
    gocardlessSecretKey: "",

    // Gmail credentials
    gmailClientId: process.env.NUXT_GMAIL_CLIENT_ID,
    gmailClientSecret: process.env.NUXT_GMAIL_CLIENT_SECRET,

    appUrl: "http://localhost:3000",
  },

  app: {
    head: {
      title: "Klarbook",
    },
  },

  nitro: {
    storage: {
      cache: {
        driver: "vercelKV",
      },
      data: { driver: "vercelKV" },
    },
  },

  modules: ["@nuxt/fonts", "nuxt-auth-utils", "@pinia/nuxt"],
})
