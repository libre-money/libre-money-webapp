<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title" style="margin-bottom: 12px">Balances</div>

        <loading-indicator :is-loading="isLoading" :phases="4" ref="loadingIndicator"></loading-indicator>

        <div class="quick-balance-table-container">
          <table class="overview-table" v-if="overview">
            <tbody>
              <tr>
                <th>Wallet</th>
                <th>Balance</th>
              </tr>
              <tr v-for="row in overview.wallets.list" v-bind:key="row.walletId">
                <td>{{ row.wallet.name }}</td>
                <td>{{ prettifyAmount(row.balance) }}
                  <span class="wallet-limit" v-if="row.minimumBalanceState !== 'not-set'">
                    <span class="wallet-limit-warning" v-if="row.minimumBalanceState === 'warning'">
                      (Approaching limit {{ prettifyAmount(row.wallet.minimumBalance!) }})
                    </span>
                    <span class="wallet-limit-exceeded" v-else-if="row.minimumBalanceState === 'exceeded'">
                      (Exceeded limit {{ prettifyAmount(row.wallet.minimumBalance!) }})
                    </span>
                    <span class="wallet-limit-normal" v-else-if="row.minimumBalanceState === 'normal'">
                      (Limit {{ prettifyAmount(row.wallet.minimumBalance!) }})
                    </span>
                  </span>
                </td>
              </tr>
              <tr>
                <th>Grand Total</th>
                <th>{{ prettifyAmount(overview.wallets.sumOfBalances) }}</th>
              </tr>
            </tbody>
          </table>
        </div>

      </q-card-section>

      <q-card-actions class="row justify-end" style="margin-right: 8px; margin-bottom: 8px">
        <q-btn color="primary" label="Close" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
import { prettifyAmount } from "src/utils/misc-utils";
import { Ref, onMounted, ref } from "vue";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { computationService } from "src/services/computation-service";
import { useSettingsStore } from "src/stores/settings";
import { setDateToTheFirstDateOfMonth } from "src/utils/date-utils";
import { Overview } from "src/models/inferred/overview";

export default {
  props: {

  },

  components: { LoadingIndicator },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    const $q = useQuasar();
    const settingsStore = useSettingsStore();

    const isLoading = ref(true);
    const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

    const recordCurrencyId: Ref<string | null> = ref(settingsStore.defaultCurrencyId);
    const startEpoch: Ref<number> = ref(setDateToTheFirstDateOfMonth(Date.now()));
    const endEpoch: Ref<number> = ref(Date.now());
    const overview: Ref<Overview | null> = ref(null);

    async function loadOverview() {
      isLoading.value = true;

      let newOverview = await computationService.computeOverview(startEpoch.value, endEpoch.value, recordCurrencyId.value!);
      overview.value = newOverview;

      isLoading.value = false;
    }

    async function okClicked() {
      onDialogOK();
    }

    onMounted(() => {
      loadOverview();
    });

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      prettifyAmount,
      overview
    };
  },
};
</script>
<style scoped lang="scss">
@import url(./../css/table.scss);


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
