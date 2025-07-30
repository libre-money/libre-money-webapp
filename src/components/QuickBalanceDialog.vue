<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title" style="margin-bottom: 12px">Balances</div>

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
                  {{ printAmount(row.balance, overviewAndCurrency.currency._id) }}
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
                <th colspan="2">{{ printAmount(overviewAndCurrency.overview!.wallets.sumOfBalances, overviewAndCurrency.currency._id) }}</th>
              </tr>
            </tbody>
          </table>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end" style="margin-right: 8px; margin-bottom: 8px">
        <q-btn color="primary" label="Close" @click="cancelClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
import { printAmount } from "src/utils/de-facto-utils";
import { Ref, onMounted, ref } from "vue";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { computationService } from "src/services/computation-service";
import { useSettingsStore } from "src/stores/settings";
import { setDateToTheFirstDateOfMonth } from "src/utils/date-utils";
import { Overview } from "src/models/inferred/overview";
import { lockService } from "src/services/lock-service";
import { dialogService } from "src/services/dialog-service";
import { CodedError } from "src/utils/error-utils";
import { Collection } from "src/constants/constants";
import { pouchdbService } from "src/services/pouchdb-service";
import { Currency } from "src/models/currency";
import WalletCalibrationDialog from "./WalletCalibrationDialog.vue";

export default {
  props: {
    intent: {
      type: String,
      default: "balances",
      validator: (value: string) => ["balances", "calibration"].includes(value),
    },
  },

  components: { LoadingIndicator },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
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

    return {
      dialogRef,
      onDialogHide,
      cancelClicked: onDialogCancel,
      isLoading,
      printAmount,
      overviewAndCurrencyList,
      onCalibrateClick,
    };
  },
};
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
