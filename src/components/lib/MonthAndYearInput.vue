<script setup lang="ts">
import debounceAsync from "src/utils/debounce";

const monthNameList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const props = defineProps({
  month: {
    type: Number,
  },
  year: {
    type: Number,
  },
});

const emit = defineEmits(["update:month", "update:year", "selection"]);

function toMonthName(month: number) {
  return monthNameList[month];
}

const emitSelection = () => {
  emit("selection");
};

const emitSelectionDebounced = debounceAsync(emitSelection, 100, { leading: false });

function prevMonth() {
  if (props.month! > 0) {
    emit("update:month", props.month! - 1);
    emitSelectionDebounced();
  } else {
    emit("update:month", 11);
    emit("update:year", props.year! - 1);
    emitSelectionDebounced();
  }
}

function nextMonth() {
  if (props.month! < monthNameList.length - 1) {
    emit("update:month", props.month! + 1);
    emitSelectionDebounced();
  } else {
    emit("update:month", 0);
    emit("update:year", props.year! + 1);
    emitSelectionDebounced();
  }
}

function prevYear() {
  if (props.year! > 0) {
    emit("update:year", props.year! - 1);
    emit("selection");
  }
}

function nextYear() {
  emit("update:year", props.year! + 1);
  emit("selection");
}
</script>

<template>
  <div>
    <q-btn flat round icon="chevron_left" @click="prevMonth"></q-btn>
    <span style="display: inline-block; min-width: 100px;">{{ toMonthName(props.month!) }}</span>
    <q-btn flat round icon="chevron_right" @click="nextMonth"></q-btn>

    <q-btn flat round icon="chevron_left" @click="prevYear"></q-btn>
    <span>{{ props.year }}</span>
    <q-btn flat round icon="chevron_right" @click="nextYear"></q-btn>
  </div>
</template>
