<script setup lang="ts">
interface Props {
  businessRecord: any
}

const { businessRecord } = defineProps<Props>()

// const { data: imageUrl } = useAsyncData(`/${businessRecord.id}/preview`, async () => {
//   const url = `/api/business-records/${businessRecord.id}/preview/1`

//   const blob = await $fetch<Blob>(url, {
//     headers: {
//       Authorization: authToken.value as string,
//     },
//   })

//   return URL.createObjectURL(blob)
// })
</script>

<template>
  <div>TODO</div>
  <!-- <img v-show="imageUrl" :src="imageUrl" alt="" class="" /> -->
</template>
