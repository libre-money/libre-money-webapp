<script setup lang="ts">
import { Collection } from "src/constants/constants";
import { Party } from "src/models/party";
import { pouchdbService } from "src/services/pouchdb-service";
import { Ref, computed, ref, watch } from "vue";
import { date } from "quasar";

const props = defineProps({
  modelValue: {
    type: Number,
  },
  label: {
    type: String,
    default: "Date & Time",
  },
});

const emit = defineEmits(["update:modelValue"]);

const value = computed({
  get() {
    let timestamp = props.modelValue;
    let dateString = date.formatDate(timestamp, "YYYY MMM DD");
    return dateString;
  },
  set(dateString) {
    let timestamp = date.extractDate(dateString, "YYYY MMM DD").getTime();
    emit("update:modelValue", timestamp);
  },
});
</script>

<template>
  <q-input filled v-model="value" :label="props.label">
    <template v-slot:prepend>
      <q-icon name="event" class="cursor-pointer">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-date v-model="value" mask="YYYY MMM DD">
            <div class="row items-center justify-end">
              <q-btn v-close-popup label="Close" color="primary" flat />
            </div>
          </q-date>
        </q-popup-proxy>
      </q-icon>
    </template>
  </q-input>
</template>
