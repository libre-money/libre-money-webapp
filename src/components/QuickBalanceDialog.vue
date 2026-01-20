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
          <table class="overview-table" v-for="currencyWallets in currencyWalletsList"
            v-bind:key="currencyWallets.currency._id">
            <tbody>
              <tr>
                <th style="width: 140px">Wallet</th>
                <th colspan="2">Balance</th>
              </tr>
              <tr v-for="wallet in currencyWallets.wallets" v-bind:key="wallet._id">
                <td>{{ wallet.name }}</td>
                <td>
                  {{ printAmount(enforceNonNegativeZero(wallet._balance || 0), currencyWallets.currency._id!) }}
                  <span class="wallet-limit" v-if="wallet._minimumBalanceState !== 'not-set'">
                    <span class="wallet-limit-warning" v-if="wallet._minimumBalanceState === 'warning'">
                      (Approaching limit {{ printAmount(wallet.minimumBalance!, currencyWallets.currency._id!) }})
                    </span>
                    <span class="wallet-limit-exceeded" v-else-if="wallet._minimumBalanceState === 'exceeded'">
                      (Exceeded limit {{ printAmount(wallet.minimumBalance!, currencyWallets.currency._id!) }})
                    </span>
                    <span class="wallet-limit-normal" v-else-if="wallet._minimumBalanceState === 'normal'">
                      (Limit {{ printAmount(wallet.minimumBalance!, currencyWallets.currency._id!) }})
                    </span>
                  </span>
                </td>
                <td>
                  <q-btn v-if="intent === 'balances'" flat dense round icon="tune"
                    @click="onCalibrateClick(wallet._id!, wallet._balance || 0)" class="q-ml-sm" />
                  <q-btn v-else-if="intent === 'calibration'" color="primary" size="sm" label="Calibrate"
                    @click="onCalibrateClick(wallet._id!, wallet._balance || 0)" class="q-ml-sm" />
                </td>
              </tr>
              <tr>
                <th>Grand Total</th>
                <th colspan="2">
                  {{ printAmount(enforceNonNegativeZero(currencyWallets.sumOfBalances), currencyWallets.currency._id!)
                  }}
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
import { Wallet } from "src/models/wallet";
import { computationService } from "src/services/computation-service";
import { currencyFormatService } from "src/services/currency-format-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { useSettingsStore } from "src/stores/settings";
import { setDateToTheFirstDateOfMonth } from "src/utils/date-utils";
import { asAmount } from "src/utils/de-facto-utils";
import { printAmount } from "src/utils/de-facto-utils";
import { CodedError } from "src/utils/error-utils";
import { enforceNonNegativeZero } from "src/utils/number-utils";
import { isNullOrUndefined } from "src/utils/misc-utils";
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

const currencyWalletsList: Ref<{ currency: Currency; wallets: Wallet[]; sumOfBalances: number; }[]> = ref([]);

function calculateMinimumBalanceState(wallet: Wallet): string {
  if (isNullOrUndefined(wallet.minimumBalance)) {
    return "not-set";
  }
  const balance = asAmount(wallet._balance || 0);
  const minimumBalance = asAmount(wallet.minimumBalance);
  if (minimumBalance * 0.8 > balance) {
    return "warning";
  }
  if (minimumBalance > balance) {
    return "exceeded";
  }
  return "normal";
}

async function loadBalances() {
  isLoading.value = true;

  const currencyList = (await pouchdbService.listByCollection(Collection.CURRENCY)).docs as Currency[];
  const walletList = (await pouchdbService.listByCollection(Collection.WALLET)).docs as Wallet[];

  // Ensure currency cache is updated for printAmount to work
  await currencyFormatService.updateCurrencyCache();

  await computationService.computeBalancesForWallets(walletList);

  // Group wallets by currency and calculate minimum balance states
  currencyWalletsList.value = currencyList.map((currency) => {
    const wallets = walletList
      .filter((wallet) => wallet.currencyId === currency._id)
      .map((wallet) => {
        wallet._minimumBalanceState = calculateMinimumBalanceState(wallet);
        return wallet;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const sumOfBalances = wallets.reduce((sum, wallet) => sum + (wallet._balance || 0), 0);

    return {
      currency,
      wallets,
      sumOfBalances,
    };
  }).filter((item) => item.wallets.length > 0);

  isLoading.value = false;
}

async function onCalibrateClick(walletId: string, balance: number) {
  const wallet = currencyWalletsList.value
    .flatMap((cw) => cw.wallets)
    .find((w) => w._id === walletId);

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
  loadBalances();
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
