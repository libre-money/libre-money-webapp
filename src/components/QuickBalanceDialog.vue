<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink row items-center justify-between">
        <div class="std-dialog-title text-primary text-weight-bold">Balances</div>
        <q-btn flat round dense icon="close" @click="cancelClicked" />
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <loading-indicator :is-loading="isLoading" :phases="4" ref="loadingIndicator"></loading-indicator>

        <div class="quick-balance-table-container">
          <table class="overview-table" v-for="overviewAndCurrency in overviewAndCurrencyList" v-bind:key="overviewAndCurrency.currency._id">
            <tbody>
              <tr>
                <th style="width: 140px">Wallet</th>
                <th colspan="2">Balance</th>
              </tr>
              <tr v-for="row in overviewAndCurrency.overview!.wallets.list" v-bind:key="row.walletId">
                <td>{{ row.wallet.name }}</td>
                <td>
                  {{ printAmount(enforceNonNegativeZero(row.balance), overviewAndCurrency.currency._id) }}
                  <span class="wallet-limit" v-if="row.minimumBalanceState !== 'not-set'">
                    <span class="wallet-limit-warning" v-if="row.minimumBalanceState === 'warning'">
                      (Approaching limit {{ printAmount(row.wallet.minimumBalance!, overviewAndCurrency.currency._id) }})
                    </span>
                    <span class="wallet-limit-exceeded" v-else-if="row.minimumBalanceState === 'exceeded'">
                      (Exceeded limit {{ printAmount(row.wallet.minimumBalance!, overviewAndCurrency.currency._id) }})
                    </span>
                    <span class="wallet-limit-normal" v-else-if="row.minimumBalanceState === 'normal'">
                      (Limit {{ printAmount(row.wallet.minimumBalance!, overviewAndCurrency.currency._id) }})
                    </span>
                  </span>
                </td>
                <td>
                  <q-btn v-if="intent === 'balances'" flat dense round icon="tune" @click="onCalibrateClick(row.walletId, row.balance)" class="q-ml-sm" />
                  <q-btn
                    v-else-if="intent === 'calibration'"
                    color="primary"
                    size="sm"
                    label="Calibrate"
                    @click="onCalibrateClick(row.walletId, row.balance)"
                    class="q-ml-sm"
                  />
                </td>
              </tr>
              <tr>
                <th>Grand Total</th>
                <th colspan="2">
                  {{ printAmount(enforceNonNegativeZero(overviewAndCurrency.overview!.wallets.sumOfBalances), overviewAndCurrency.currency._id) }}
                </th>
              </tr>
            </tbody>
          </table>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { Collection } from "src/constants/constants";
import { Currency } from "src/models/currency";
import { Overview } from "src/models/inferred/overview";
import { computationService } from "src/services/computation-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { useSettingsStore } from "src/stores/settings";
import { setDateToTheFirstDateOfMonth } from "src/utils/date-utils";
import { printAmount } from "src/utils/de-facto-utils";
import { CodedError } from "src/utils/error-utils";
import { enforceNonNegativeZero } from "src/utils/number-utils";
import { Ref, onMounted, ref } from "vue";
import WalletCalibrationDialog from "./WalletCalibrationDialog.vue";

// Props
const props = defineProps({
  intent: {
    type: String,
    default: "balances",
    validator: (value: string) => ["balances", "calibration"].includes(value),
  },
});

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const $q = useQuasar();
const settingsStore = useSettingsStore();

const isLoading = ref(true);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const startEpoch: Ref<number> = ref(setDateToTheFirstDateOfMonth(Date.now()));
const endEpoch: Ref<number> = ref(Date.now());

const overviewAndCurrencyList: Ref<{ overview: Overview | null; currency: Currency }[]> = ref([]);

async function loadOverview() {
  isLoading.value = true;

  const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
  overviewAndCurrencyList.value = await Promise.all(
    currencyList.map(async (currency) => {
      let newOverview = await computationService.computeOverview(startEpoch.value, endEpoch.value, currency._id!);
      if (newOverview) {
        newOverview.wallets.list.sort((a, b) => a.wallet.name.localeCompare(b.wallet.name));
      }
      return { overview: newOverview, currency };
    })
  );

  isLoading.value = false;
}

async function onCalibrateClick(walletId: string, balance: number) {
  const wallet = overviewAndCurrencyList.value.flatMap((oc) => oc.overview?.wallets.list || []).find((w) => w.walletId === walletId)?.wallet;

  if (!wallet) {
    throw new CodedError("WALLET_NOT_FOUND", "Wallet not found");
  }

  $q.dialog({ component: WalletCalibrationDialog, componentProps: { wallet, balance } })
    .onOk(() => {
      onDialogOK();
    })
    .onCancel(() => {
      onDialogCancel();
    });
}

onMounted(() => {
  loadOverview();
});

function cancelClicked() {
  onDialogCancel();
}
</script>
<style scoped lang="scss">
@import url(./../css/table.scss);

.quick-balance-table-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wallet-limit-normal {
  color: #546e7a;
}

.wallet-limit-warning {
  color: #546e7a;
  border-bottom: 4px solid #ffd740;
}

.wallet-limit-exceeded {
  color: #bf360c;
}

@media (max-width: $breakpoint-xs-max) {
  .wallet-limit {
    display: block;
  }
}
</style>
