<script setup lang="ts">
import ErrorPageShell from "@/components/ErrorPageShell.vue";
</script>

<template>
  <ErrorPageShell
    code="403"
    description-key="errors.forbidden.description"
    title-key="errors.forbidden.title"
  />
</template>
