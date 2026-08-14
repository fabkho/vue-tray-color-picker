<script setup lang="ts">
import { PACKAGE_NAME } from 'vue-tray-color-picker'
</script>

<template>
  <h1>{{ PACKAGE_NAME }}</h1>
  <p class="subtitle">
    Development surface. Cases are seeded with the awkward inputs, not a happy path.
  </p>

  <section class="case">
    <h2 class="case__title">
      Scaffold
    </h2>
    <p class="case__note">
      The library resolves and the workspace link works. Cases arrive with #4.
    </p>
  </section>
</template>
