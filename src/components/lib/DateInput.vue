<script setup lang="ts">
import { date } from "quasar";
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: Number,
  },
  label: {
    type: String,
    default: "Date & Time",
  },
  onlyIcon: {
    type: Boolean,
    default: false,
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
  <template v-if="!onlyIcon">
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
  <template v-else>
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
</template>
