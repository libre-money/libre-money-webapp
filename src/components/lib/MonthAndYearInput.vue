<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { Party } from "src/models/party";
import { pouchdbService } from "src/services/pouchdb-service";
import { Ref, computed, ref, watch } from "vue";
import { date } from "quasar";

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

function prevMonth() {
  if (props.month! > 0) {
    emit("update:month", props.month! - 1);
    emit("selection");
  }
}

function nextMonth() {
  if (props.month! < monthNameList.length - 1) {
    emit("update:month", props.month! + 1);
    emit("selection");
  } else {
    emit("update:month", props.month! + 0);
    emit("update:year", props.year! + 1);
    emit("selection");
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
    <span>{{ toMonthName(props.month!) }}</span>
    <q-btn flat round icon="chevron_right" @click="nextMonth"></q-btn>

    <q-btn flat round icon="chevron_left" @click="prevYear"></q-btn>
    <span>{{ props.year }}</span>
    <q-btn flat round icon="chevron_right" @click="nextYear"></q-btn>
  </div>
</template>
