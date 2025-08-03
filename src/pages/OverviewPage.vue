<template>
  <q-page class="items-center page">
    <div class="q-pa-md row justify-end std-card" style="margin-right: 0; margin-bottom: -36px; width: 100%; align-items: center">
      <select-currency v-model="recordCurrencyId"></select-currency>
      <q-btn icon="refresh" flat round size="lg" @click="reloadClicked" style="margin-top: -32px" />
    </div>

    <q-card class="std-card q-pa-md" :hidden="!isLoading">
      <loading-indicator :is-loading="isLoading" :phases="2" ref="loadingIndicator"></loading-indicator>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && !overview">
      <div class="q-pa-md q-gutter-sm">
        <div>
          Welcome to Cash Keeper!<br /><br />
          If this is your first time here, please read the <strong>Currently Imaginary</strong> getting started guide.<br /><br />
          If you already have some data on our servers, use the button to the top right to <strong>Sync</strong> your data to this device.<br /><br />
          Enjoy!
        </div>
      </div>
    </q-card>

    <q-card class="std-card" v-if="!isLoading && overview">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Wallet Balances</div>
      </div>

      <div class="q-pa-md">
        <table class="overview-table">
          <tbody>
            <tr>
              <th>Wallet</th>
              <th>Balance</th>
            </tr>
            <tr v-for="row in overview.wallets.list" v-bind:key="row.walletId">
              <td>{{ row.wallet.name }}</td>
              <td>
                {{ printAmount(row.balance) }}
                <span class="wallet-limit" v-if="row.minimumBalanceState !== 'not-set'">
                  <span class="wallet-limit-warning" v-if="row.minimumBalanceState === 'warning'">
                    (Approaching limit {{ printAmount(row.wallet.minimumBalance!) }})
                  </span>
                  <span class="wallet-limit-exceeded" v-else-if="row.minimumBalanceState === 'exceeded'">
                    (Exceeded limit {{ printAmount(row.wallet.minimumBalance!) }})
                  </span>
                  <span class="wallet-limit-normal" v-else-if="row.minimumBalanceState === 'normal'">
                    (Limit {{ printAmount(row.wallet.minimumBalance!) }})
                  </span>
                </span>
              </td>
            </tr>
            <tr>
              <th>Grand Total</th>
              <th>{{ printAmount(overview.wallets.sumOfBalances) }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <br />
    <div style="min-height: 120px; min-width: 300px; display: block"></div>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import SelectCurrency from "src/components/SelectCurrency.vue";

import { Overview } from "src/models/inferred/overview";
import { computationService } from "src/services/computation-service";
import { dialogService } from "src/services/dialog-service";
import { errorService } from "src/services/error-service";
import { lockService } from "src/services/lock-service";
import { useSettingsStore } from "src/stores/settings";
import { setDateToTheFirstDateOfMonth } from "src/utils/date-utils";
import { printAmount as printAmountUtil } from "src/utils/de-facto-utils";
import { CodedError } from "src/utils/error-utils";
import { Ref, onMounted, ref, watch } from "vue";

const $q = useQuasar();
const settingsStore = useSettingsStore();

// ----- Refs
const isMounted = ref(false);

const isLoading = ref(true);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const recordCurrencyId: Ref<string | null> = ref(settingsStore.defaultCurrencyId);

const startEpoch: Ref<number> = ref(setDateToTheFirstDateOfMonth(Date.now()));
const endEpoch: Ref<number> = ref(Date.now());
const overview: Ref<Overview | null> = ref(null);

// ----- Functions

async function loadOverview() {
  let newOverview = await computationService.computeOverview(startEpoch.value, endEpoch.value, recordCurrencyId.value!);
  overview.value = newOverview;
}

async function loadData() {
  return await errorService.handleUnexpectedError(async () => {
    if (!lockService.acquireLock("OverviewPage/loadData", 2_000)) return;

    isLoading.value = true;

    try {
      await lockService.awaitTillTruthy(1000, () => recordCurrencyId.value);
    } catch (error) {
      console.error("Error while waiting for record currency id", error);
      if (error instanceof CodedError && error.code === "TIMED_OUT" && !recordCurrencyId.value) {
        await dialogService.alert("Error", "Please set a default currency in settings.");
      }
    }

    loadingIndicator.value?.startPhase({ phase: 2, weight: 60, label: "Preparing overview" });
    await loadOverview();

    await loadingIndicator.value?.waitMinimalDuration(400);

    isLoading.value = false;
    lockService.releaseLock("OverviewPage/loadData");
  });
}

// ----- Event Handlers

async function reloadClicked() {
  loadData();
}

// ----- Computed and Embedded

function printAmount(amount: number) {
  return printAmountUtil(amount, overview.value?.currency._id);
}

// ----- Watchers

watch(recordCurrencyId, (newValue, __) => {
  if (newValue) {
    if (isMounted.value) {
      loadData();
    }
  }
});

// ----- Execution

onMounted(() => {
  isMounted.value = true;
  loadData();
});
</script>

<style scoped lang="scss">
@import url(./../css/table.scss);

.filter-row {
  display: flex;
  align-items: baseline;
}

.page {
  display: flex;
  flex-direction: column;
}

.title-row {
  padding-bottom: 0px;
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
