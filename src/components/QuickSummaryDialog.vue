<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section v-if="quickSummaryList.length">
        <div class="std-dialog-title" style="margin-bottom: 12px">Summary</div>
        <div class="quick-summary-container">
          <div v-for="quickSummary in quickSummaryList" v-bind:key="quickSummary.currency._id!" style="padding-bottom: 12px">
            <table class="overview-table quick-summary-table">
              <tbody>
                <tr>
                  <th colspan="4">{{ quickSummary.currency.name }}</th>
                </tr>
                <tr>
                  <td>Total Income</td>
                  <td class="amount-in">{{ printAmount(quickSummary.totalIncome, quickSummary.currency._id) }}</td>
                  <td>Total In-flow</td>
                  <td class="amount-in">{{ printAmount(quickSummary.totalInFlow, quickSummary.currency._id) }}</td>
                </tr>
                <tr>
                  <td>Total Expense</td>
                  <td class="amount-out">{{ printAmount(quickSummary.totalExpense, quickSummary.currency._id) }}</td>
                  <td>Total Out-flow</td>
                  <td class="amount-out">{{ printAmount(quickSummary.totalOutFlow, quickSummary.currency._id) }}</td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td>Cash Flow Balance</td>
                  <td>{{ printAmount(quickSummary.totalFlowBalance, quickSummary.currency._id) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end" style="margin-right: 8px; margin-bottom: 8px">
        <q-btn color="primary" label="Close" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { useDialogPluginComponent } from "quasar";
import { printAmount } from "src/utils/de-facto-utils";
import { ref } from "vue";

export default {
  props: {
    quickSummaryList: {
      type: Object,
      required: true,
    },
  },

  components: {},

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const isLoading = ref(false);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    isLoading.value = true;

    isLoading.value = false;

    async function okClicked() {
      onDialogOK();
    }

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      printAmount,
    };
  },
};
</script>
<style scoped lang="scss">
@import url(./../css/table.scss);
</style>
