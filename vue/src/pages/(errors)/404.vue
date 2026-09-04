<script setup lang="ts">
import ErrorPageShell from "@/components/ErrorPageShell.vue";
</script>

<template>
  <ErrorPageShell
    code="404"
    description-key="errors.notFound.description"
    title-key="errors.notFound.title"
  />
</template>
