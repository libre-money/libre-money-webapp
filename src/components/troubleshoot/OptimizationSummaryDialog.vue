<template>
  <q-dialog :model-value="modelValue" persistent>
    <q-card style="min-width: 360px; max-width: 520px">
      <q-card-section>
        <div class="text-h6">Optimization Summary</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="q-mb-sm">
          <div class="text-body2"><b>Documents scanned:</b> {{ summary?.totalDocs ?? 0 }}</div>
          <div class="text-body2"><b>Documents updated:</b> {{ summary?.updatedDocs ?? 0 }}</div>
          <div class="text-body2"><b>Duration:</b> {{ formattedDuration }}</div>
        </div>

        <q-banner dense class="bg-grey-2 text-black">
          The app will reload when you press <b>Okay</b>.
        </q-banner>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn color="primary" label="Okay" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { OptimizationSummary } from "src/services/optimization-service";

const props = defineProps<{
  modelValue: boolean;
  summary: OptimizationSummary | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const formattedDuration = computed(() => {
  const ms = props.summary?.durationMs ?? 0;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${remSeconds}s`;
});

function okClicked() {
  emit("update:modelValue", false);
  // @ts-ignore
  window.location.reload(true);
}
</script>

