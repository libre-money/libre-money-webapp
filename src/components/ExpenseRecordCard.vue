<template>
  <q-card flat bordered class="expense-record-card">
    <q-item>
      <q-item-section>
        <q-item-label>
          <div class="row items-center justify-between">
            <div class="col">
              <div class="text-caption text-grey-6">{{ formattedDate }}</div>
              <div class="text-h6 text-weight-medium expense-category">
                {{ record.expense?.expenseAvenue?.name || "Unknown Category" }}
              </div>
            </div>
            <div class="col-auto">
              <div class="text-h5 text-negative text-weight-bold amount">
                {{ expenseAmount }}
              </div>
            </div>
          </div>
        </q-item-label>

        <q-item-label v-if="record.notes" caption class="q-mt-sm">
          <q-icon name="note" size="xs" class="q-mr-xs" />
          {{ record.notes }}
        </q-item-label>

        <q-item-label v-if="record.tagList && record.tagList.length > 0" class="q-mt-sm">
          <div class="row q-gutter-xs">
            <q-chip
              v-for="tag in record.tagList"
              :key="tag._id"
              :style="{
                backgroundColor: tag.color,
                color: getFontColor(tag.color),
              }"
              dense
              size="sm"
            >
              {{ tag.name }}
            </q-chip>
          </div>
        </q-item-label>
      </q-item-section>

      <q-item-section side top>
        <div class="column q-gutter-xs">
          <q-btn round color="primary" icon="edit" size="sm" @click="$emit('edit', record)">
            <q-tooltip>Edit Expense</q-tooltip>
          </q-btn>
          <q-btn round color="negative" icon="delete" size="sm" @click="$emit('delete', record)">
            <q-tooltip>Delete Expense</q-tooltip>
          </q-btn>
        </div>
      </q-item-section>
    </q-item>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { InferredRecord } from "src/models/inferred/inferred-record";
import { printAmount } from "src/utils/de-facto-utils";
import { prettifyDate } from "src/utils/misc-utils";

interface Props {
  record: InferredRecord;
}

const props = defineProps<Props>();

defineEmits<{
  edit: [record: InferredRecord];
  delete: [record: InferredRecord];
}>();

const formattedDate = computed(() => {
  return prettifyDate(props.record.transactionEpoch || Date.now());
});

const expenseAmount = computed(() => {
  const amount = props.record.expense?.amount;
  const currencyId = props.record.expense?.currencyId;
  if (amount && currencyId) {
    return printAmount(amount, currencyId);
  }
  return "N/A";
});

function getFontColor(backgroundColor: string): string {
  // Simple algorithm to determine if we need light or dark text
  // based on background color brightness
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#000000" : "#ffffff";
}
</script>

<style scoped lang="scss">
.expense-record-card {
  margin-bottom: 8px;
  border-radius: 8px;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.expense-category {
  margin-top: 4px;
}

.amount {
  font-family: "Roboto", sans-serif;
  white-space: nowrap;
  margin-left: 16px;
}
</style>
