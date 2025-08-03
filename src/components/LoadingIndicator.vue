<script setup lang="ts">
import { sleep } from "src/utils/misc-utils";
import { Ref, ref } from "vue";

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false,
    required: true,
  },
  phases: {
    type: Number,
    default: 1,
  },
  label: {
    type: String,
    default: "Loading...",
  },
});

let startEpoch = 0;

const totalPercentage: Ref<number> = ref(0);

let currentWeight = 0;
let pastWeights = 0;

const currentPhase: Ref<number> = ref(1);
const currentPhaseProgressPercentage: Ref<number> = ref(0);
const currentLabel: Ref<string> = ref("");

const startPhase = (params: { phase: number; label: string; weight: number }) => {
  if (params.phase === 1) {
    totalPercentage.value = 0;
    startEpoch = Date.now();
    currentWeight = 0;
    pastWeights = 0;
  }
  pastWeights += currentWeight;
  currentWeight = params.weight;
  currentPhase.value = params.phase;
  currentLabel.value = params.label;
  setProgress(0);
};

const setProgress = (progressFraction: number) => {
  currentPhaseProgressPercentage.value = Math.round(progressFraction * 100);
  const currentPhasePercentageConsideringWeight = (currentWeight / 100) * currentPhaseProgressPercentage.value;
  const totalPercentageTemp = pastWeights + currentPhasePercentageConsideringWeight;
  totalPercentage.value = Math.round(totalPercentageTemp * 100) / 100;
};

const waitMinimalDuration = async (minimumDelayMillis: number) => {
  const diff = minimumDelayMillis - (Date.now() - startEpoch);
  if (diff > 0) {
    await sleep(diff);
  }
};

defineExpose({
  startPhase,
  setProgress,
  waitMinimalDuration,
});
</script>

<template>
  <div v-if="isLoading">
    <div style="text-align: center">
      <q-circular-progress
        show-value
        font-size="12px"
        :value="totalPercentage"
        size="50px"
        :thickness="0.22"
        color="teal"
        track-color="grey-3"
        class="q-ma-md"
        :indeterminate="totalPercentage === 0"
      >
        <span>{{ totalPercentage }}%</span>
      </q-circular-progress>

      <div style="color: #7d858a">{{ currentLabel || label }}</div>
    </div>
  </div>
</template>
