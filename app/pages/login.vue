<script setup lang="ts">
import { useSessionStorage } from "@vueuse/core"
import { ArrowLeft, OctagonX, ShieldQuestion } from "lucide-vue-next"

definePageMeta({
  layout: "auth",
})

const email = useSessionStorage("user-email", "")
const password = ref("")
const loading = ref(false)
const errorMessage = ref("")

function reset() {
  loading.value = false
  email.value = ""
  password.value = ""
  errorMessage.value = ""
}

const { fetch: refresh } = useUserSession()

async function signIn() {
  try {
    loading.value = true

    await $fetch("/api/login", {
      method: "POST",
      body: {
        email: email.value,
        password: password.value,
      },
    })

    await refresh()

    await navigateTo("/")
  } catch (error: any) {
    handleError(error)
  } finally {
    loading.value = false
  }
}

function handleError(error: any) {
  console.error(error)

  if (error?.message?.includes("Invalid login credentials")) {
    errorMessage.value = "Invalid email or password"
  } else {
    errorMessage.value = "Unknown error"
  }
}
</script>

<template>
  <d-auth-container title="Welcome to Klarbook">
    <form @submit.prevent="signIn">
      <d-auth-error v-if="errorMessage" :message="errorMessage" />

      <div class="flex flex-col gap-3">
        <d-auth-input
          label="Email Address"
          name="email"
          type="email"
          v-model="email"
          placeholder="john@example.com"
          autocomplete="email"
          required
        />
        <d-auth-input
          label="Password"
          name="password"
          type="password"
          v-model="password"
          placeholder="••••••••"
          autocomplete="current-password"
          required
        />
        <d-button variant="primary" type="submit" class="w-full justify-center" size="LG" :loading="loading">
          Sign In
        </d-button>

        <d-button size="MD" class="w-full" variant="outline" :icon-left="ShieldQuestion">Forgot Password?</d-button>
      </div>
    </form>

    <template #footer>
      <d-button to="/register" size="MD" class="w-full" variant="outline" :icon-left="ShieldQuestion">
        Don't have an account yet?
      </d-button>
    </template>
  </d-auth-container>
</template>
