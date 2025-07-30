<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title" style="margin-bottom: 12px">Calibrate Wallet</div>

        <div class="wallet-calibration-content">
          <div class="wallet-name">Wallet: {{ wallet.name }}</div>

          <div class="balance-section">
            <div class="balance-row">
              <span class="balance-label">Current Balance:</span>
              <span class="balance-value">{{ printAmount(calibration?.currentBalance, calibration?.currencyId) }}</span>
            </div>

            <div class="balance-row">
              <span class="balance-label">New Balance:</span>
              <div class="balance-controls">
                <q-btn flat dense icon="add" @click="incrementBalance" />
                <q-input v-model.number="newBalance" type="number" dense outlined :step="stepSize" class="balance-input" />
                <q-btn flat dense icon="remove" @click="decrementBalance" />
              </div>
            </div>

            <div class="balance-row" v-if="balanceDifference !== 0">
              <span class="balance-label">Total {{ balanceDifference > 0 ? "Increase" : "Decrease" }}:</span>
              <span class="balance-value">{{ printAmount(Math.abs(balanceDifference), calibration?.currencyId) }}</span>
            </div>
          </div>

          <div class="breakdown-section">
            <div class="breakdown-header">
              <span class="section-title">Breakdown</span>
              <q-btn flat dense icon="add" label="Add Breakdown" @click="addBreakdownRow" class="add-breakdown-btn" />
            </div>

            <div v-for="(row, index) in breakdownRows" :key="index" class="breakdown-row">
              <q-btn
                flat
                dense
                :icon="row.type === 'income' ? 'arrow_upward' : 'arrow_downward'"
                @click="row.type = row.type === 'income' ? 'expense' : 'income'"
                class="type-toggle-btn"
              />

              <div class="breakdown-selector">
                <select-expense-avenue v-if="row.type === 'expense'" v-model="row.expenseAvenueId" />
                <select-income-source v-else v-model="row.incomeSourceId" />
              </div>

              <q-input v-model.number="row.amount" type="number" dense outlined class="breakdown-amount" />
              <q-btn flat dense icon="delete" @click="removeBreakdownRow(index)" class="delete-btn" />
            </div>

            <div class="breakdown-row" v-if="remainingAmount !== 0">
              <span class="auto-adjusted">
                Auto-adjusted {{ remainingAmount > 0 ? "Income" : "Expense" }}: {{ printAmount(Math.abs(remainingAmount), calibration?.currencyId) }}
              </span>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-start std-bottom-action-row">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <div class="spacer"></div>
        <q-btn color="primary" label="Save" @click="saveClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { useDialogPluginComponent } from "quasar";
import { ref, Ref, watch, computed, onMounted } from "vue";
import { entityService } from "src/services/entity-service";
import { useSettingsStore } from "src/stores/settings";
import { printAmount } from "src/utils/de-facto-utils";
import SelectExpenseAvenue from "./SelectExpenseAvenue.vue";
import SelectIncomeSource from "./SelectIncomeSource.vue";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection, fixtureCode, RecordType } from "src/constants/constants";
import { asAmount } from "src/utils/misc-utils";
import { Record } from "src/models/record";
import { dialogService } from "src/services/dialog-service";

type WalletCalibration = {
  walletId: string;
  currencyId: string;
  currencySign: string;
  currentBalance: number;
};

type BreakdownRow = {
  type: "expense" | "income";
  expenseAvenueId: string;
  incomeSourceId: string;
  amount: number;
};

export default {
  props: {
    wallet: {
      type: Object,
      required: true,
    },
    balance: {
      type: Number,
      required: true,
    },
  },

  components: {
    SelectExpenseAvenue,
    SelectIncomeSource,
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
    const settingsStore = useSettingsStore();

    const calibration: Ref<WalletCalibration | null> = ref(null);
    const newBalance = ref(0);
    const breakdownRows = ref<BreakdownRow[]>([]);

    const stepSize = computed(() => settingsStore.walletCalibrationStepSize);
    const breakdownTypes = [
      { label: "Expense Avenue", value: "expense" },
      { label: "Income Source", value: "income" },
    ];

    const balanceDifference = computed(() => {
      if (!calibration.value) return 0;
      return newBalance.value - calibration.value.currentBalance;
    });

    const totalBreakdownAmount = computed(() => {
      return breakdownRows.value.reduce((sum, row) => {
        return sum + (row.type === "income" ? row.amount : -row.amount);
      }, 0);
    });

    const remainingAmount = computed(() => {
      return balanceDifference.value - totalBreakdownAmount.value;
    });

    function incrementBalance() {
      newBalance.value += stepSize.value;
    }

    function decrementBalance() {
      newBalance.value -= stepSize.value;
    }

    function addBreakdownRow() {
      breakdownRows.value.push({
        type: "expense",
        expenseAvenueId: "",
        incomeSourceId: "",
        amount: 0,
      });
    }

    function removeBreakdownRow(index: number) {
      breakdownRows.value.splice(index, 1);
    }

    async function loadCalibration() {
      let currency = await entityService.getCurrency(props.wallet.currencyId!);

      calibration.value = {
        walletId: props.wallet._id!,
        currencyId: props.wallet.currencyId!,
        currencySign: currency.sign,
        currentBalance: props.balance,
      };

      newBalance.value = props.balance;
    }

    async function saveClicked() {
      console.debug({ calibration: JSON.parse(JSON.stringify(calibration.value)) });
      console.debug({ breakdownRows: JSON.parse(JSON.stringify(breakdownRows.value)) });
      console.debug({ newBalance: newBalance.value });
      console.debug({ balanceDifference: balanceDifference.value });
      console.debug({ totalBreakdownAmount: totalBreakdownAmount.value });
      console.debug({ remainingAmount: remainingAmount.value });

      const autoCalibratedExpenseAvenue = await entityService.getExpenseAvenueByFixtureCode(fixtureCode.AUTO_CALIBRATED_EXPENSE);
      const autoCalibratedIncomeSource = await entityService.getIncomeSourceByFixtureCode(fixtureCode.AUTO_CALIBRATED_INCOME);

      if (!autoCalibratedExpenseAvenue || !autoCalibratedIncomeSource) {
        await dialogService.alert("Error", "Auto-calibrated expense avenue or income source not found. Please sync your database and try again.");
        return;
      }

      // Create records for each breakdown row
      for (const row of breakdownRows.value) {
        let record: Record;
        if (row.type === "income") {
          record = {
            $collection: Collection.RECORD,
            notes: `Added during wallet calibration for ${props.wallet.name}`,
            type: RecordType.INCOME,
            tagIdList: [],
            transactionEpoch: Date.now(),
            income: {
              incomeSourceId: row.incomeSourceId,
              amount: asAmount(row.amount),
              currencyId: calibration.value!.currencyId,
              walletId: calibration.value!.walletId,
              amountPaid: asAmount(row.amount),
              amountUnpaid: 0,
              partyId: null,
            },
          };
        } else {
          record = {
            $collection: Collection.RECORD,
            notes: `Added during wallet calibration for ${props.wallet.name}`,
            type: RecordType.EXPENSE,
            tagIdList: [],
            transactionEpoch: Date.now(),
            expense: {
              expenseAvenueId: row.expenseAvenueId,
              amount: asAmount(row.amount),
              currencyId: calibration.value!.currencyId,
              walletId: calibration.value!.walletId,
              amountPaid: asAmount(row.amount),
              amountUnpaid: 0,
              partyId: null,
            },
          };
        }

        await pouchdbService.upsertDoc(record);
      }

      // Create auto-calibrated record for remaining amount if any
      if (remainingAmount.value !== 0) {
        let record: Record;
        if (remainingAmount.value > 0) {
          record = {
            $collection: Collection.RECORD,
            notes: `Auto-calibrated adjustment for ${props.wallet.name}`,
            type: RecordType.INCOME,
            tagIdList: [],
            transactionEpoch: Date.now(),
            income: {
              incomeSourceId: autoCalibratedIncomeSource!._id!,
              amount: asAmount(Math.abs(remainingAmount.value)),
              currencyId: calibration.value!.currencyId,
              walletId: calibration.value!.walletId,
              amountPaid: asAmount(Math.abs(remainingAmount.value)),
              amountUnpaid: 0,
              partyId: null,
            },
          };
        } else {
          record = {
            $collection: Collection.RECORD,
            notes: `Auto-calibrated adjustment for ${props.wallet.name}`,
            type: RecordType.EXPENSE,
            tagIdList: [],
            transactionEpoch: Date.now(),
            expense: {
              expenseAvenueId: autoCalibratedExpenseAvenue!._id!,
              amount: asAmount(Math.abs(remainingAmount.value)),
              currencyId: calibration.value!.currencyId,
              walletId: calibration.value!.walletId,
              amountPaid: asAmount(Math.abs(remainingAmount.value)),
              amountUnpaid: 0,
              partyId: null,
            },
          };
        }

        await pouchdbService.upsertDoc(record);
      }

      onDialogOK();
    }

    onMounted(() => {
      loadCalibration();
    });

    return {
      dialogRef,
      onDialogHide,
      saveClicked,
      cancelClicked: onDialogCancel,
      calibration,
      newBalance,
      breakdownRows,
      stepSize,
      breakdownTypes,
      balanceDifference,
      remainingAmount,
      incrementBalance,
      decrementBalance,
      addBreakdownRow,
      removeBreakdownRow,
      printAmount,
      totalBreakdownAmount,
    };
  },
};
</script>

<style scoped lang="scss">
.wallet-calibration-content {
  padding: 16px 0;
}

.wallet-name {
  font-size: 1.1em;
  margin-bottom: 16px;
}

.balance-section {
  margin-bottom: 24px;
}

.balance-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.balance-label {
  width: 140px;
  font-weight: 500;
}

.balance-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.balance-input {
  width: 120px;
}

.breakdown-section {
  margin-top: 24px;
}

.breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-weight: 500;
}

.breakdown-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.breakdown-selector {
  width: 150px;
  margin-top: 30px;
}

.breakdown-amount {
  width: 120px;
}

.auto-adjusted {
  color: #546e7a;
  font-style: italic;
}

.spacer {
  flex: 1;
}

.type-toggle-btn {
  min-width: 40px;
}
</style>
