<script setup lang="ts">
import ErrorPageShell from "@/components/ErrorPageShell.vue";
</script>

<template>
  <ErrorPageShell
    code="500"
    description-key="errors.serverError.description"
    title-key="errors.serverError.title"
  />
</template>
