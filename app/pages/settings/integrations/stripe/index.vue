<script setup lang="ts">
import { ArrowLeftIcon, CreditCardIcon, RefreshCwIcon, CheckCircle } from "lucide-vue-next"

definePageMeta({
  layout: "settings",
})

// State
const isLoading = ref(false)
const isCheckingStatus = ref(true)
const isConnected = ref(false)
const isSyncing = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const syncDetails = ref<any>(null)
const apiKey = ref<string>("")

// Check if Stripe is connected
async function checkConnectionStatus() {
  isCheckingStatus.value = true
  error.value = null

  try {
    const { connected } = await $fetch("/api/integrations/stripe/status", {
      method: "GET"
    })

    isConnected.value = connected
  } catch (err) {
    console.error("Error checking Stripe connection:", err)
    error.value = "Failed to check connection status"
  } finally {
    isCheckingStatus.value = false
  }
}

// Connect to Stripe
async function connectStripe() {
  isLoading.value = true
  error.value = null

  try {
    await $fetch("/api/integrations/stripe/connect", {
      method: "POST",
      body: {
        apiKey: apiKey.value
      }
    })

    successMessage.value = "Successfully connected to Stripe"
    isConnected.value = true
    apiKey.value = ""
  } catch (err) {
    console.error("Error connecting to Stripe:", err)
    error.value = "Failed to connect to Stripe. Please check your API key and try again."
  } finally {
    isLoading.value = false
  }
}

// Sync invoices
async function syncInvoices() {
  isSyncing.value = true
  error.value = null
  successMessage.value = null

  try {
    const result = await $fetch("/api/integrations/stripe/invoices/sync", {
      method: "POST",
    })

    syncDetails.value = result

    if (result.success) {
      successMessage.value = `Successfully processed ${result.processed} invoices (${result.failed} failed)`
    }
  } catch (err) {
    console.error("Error syncing invoices:", err)
    error.value = "Failed to sync invoices"
  } finally {
    isSyncing.value = false
  }
}

// Check connection status on page load
onMounted(() => {
  checkConnectionStatus()
})
</script>

<template>
  <d-page>
    <div class="mx-auto w-full max-w-3xl py-16">
      <div class="mb-8 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <NuxtLink to="/settings/integrations" class="text-zinc-500 hover:text-zinc-800">
            <ArrowLeftIcon class="h-5 w-5" />
          </NuxtLink>
          <h1 class="text-2xl text-zinc-800">Stripe Integration</h1>
        </div>
      </div>

      <div v-if="error" class="mb-6 rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <ExclamationTriangleIcon class="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">{{ error }}</h3>
          </div>
        </div>
      </div>

      <div v-if="successMessage" class="mb-6 rounded-md bg-green-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <CheckCircle class="h-5 w-5 text-green-400" aria-hidden="true" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">{{ successMessage }}</h3>
          </div>
        </div>
      </div>

      <div class="rounded-md border border-zinc-200 bg-white p-6">
        <div class="flex flex-col gap-6">
          <div>
            <h2 class="mb-1 text-lg font-medium text-zinc-900">Stripe Integration</h2>
            <p class="text-sm text-zinc-500">
              Connect your Stripe account to automatically import invoices into Klarbook.
            </p>
          </div>

          <div v-if="isCheckingStatus" class="flex items-center gap-2 text-sm text-zinc-600">
            <RefreshCwIcon class="h-4 w-4 animate-spin" />
            Checking connection status...
          </div>

          <div v-else>
            <div v-if="isConnected" class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle class="h-6 w-6" />
              </div>
              <div>
                <div class="font-medium">Connected to Stripe</div>
                <div class="text-sm text-zinc-500">Your Stripe account is connected to Klarbook.</div>
              </div>
            </div>

            <div v-else class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                <CreditCardIcon class="h-6 w-6" />
              </div>
              <div>
                <div class="font-medium">Not connected</div>
                <div class="text-sm text-zinc-500">Connect your Stripe account to import invoices automatically.</div>
              </div>
            </div>

            <div v-if="!isConnected" class="mt-6">
              <label for="api-key" class="block text-sm font-medium text-gray-700">Stripe API Key</label>
              <div class="mt-1">
                <input
                  id="api-key"
                  v-model="apiKey"
                  type="password"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="sk_test_..."
                />
              </div>
              <p class="mt-1 text-xs text-gray-500">
                Enter your Stripe API key. You can find this in your Stripe Dashboard under Developers > API keys.
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <d-button v-if="!isConnected" :loading="isLoading" :disabled="!apiKey" @click="connectStripe" class="w-full sm:w-auto">
              Connect Stripe Account
            </d-button>

            <d-button v-if="isConnected" :loading="isSyncing" @click="syncInvoices" class="w-full sm:w-auto">
              <RefreshCwIcon v-if="isSyncing" class="mr-2 h-4 w-4 animate-spin" />
              <span>Sync Invoices</span>
            </d-button>
          </div>

          <!-- Sync Details -->
          <div v-if="syncDetails" class="mt-4">
            <h3 class="mb-2 text-sm font-medium text-zinc-900">Last Sync Results</h3>
            <div class="rounded-md border border-zinc-200 p-4">
              <div class="mb-2 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div class="font-medium">Total Invoices</div>
                  <div>{{ syncDetails.total }}</div>
                </div>
                <div>
                  <div class="font-medium">Processed</div>
                  <div>{{ syncDetails.processed }}</div>
                </div>
                <div>
                  <div class="font-medium">Failed</div>
                  <div>{{ syncDetails.failed }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </d-page>
</template>