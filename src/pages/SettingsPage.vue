<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Application Settings</div>
        <q-btn color="primary" text-color="white" label="Save Changes" @click="saveChangesClicked" />
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title">Enter how many records you want to see at once in the Records page.</div>
        <q-input
          type="number"
          v-model="recordPaginationSize"
          label="Records per page"
          :rules="validators.nonZeroInteger"
          style="margin-right: 8px"
          class="local-control"
        ></q-input>
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title">Enter how many rows you want to see in one page.</div>
        <q-input
          type="number"
          v-model="paginationSize"
          label="Rows per page"
          :rules="validators.nonZeroInteger"
          style="margin-right: 8px"
          class="local-control"
        ></q-input>
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title" style="margin-bottom: 12px">Select the default Currency. This will be used throughout the application.</div>
        <div class="local-control" style="margin-bottom: -24px">
          <select-currency label="Default Currency" v-model="defaultCurrencyId"> </select-currency>
        </div>
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title" style="margin-bottom: 12px">Select what view you want to see when you open the application</div>
        <q-toggle
          class="control-toggle"
          v-model="rememberLastOpenedView"
          color="green"
          left-label
          label="Remember last opened view"
          style="margin-bottom: 12px"
        />
        <div class="local-control" style="margin-bottom: -24px">
          <q-select
            :disable="rememberLastOpenedView"
            filled
            v-model="defaultView"
            :options="defaultViewOptionList"
            label="Default View"
            emit-value
            map-options
            class="std-margin-bottom-32"
          />
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { defaultViewOptionList } from "src/constants/constants";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { useRecordPaginationSizeStore } from "src/stores/record-pagination";
import { useSettingsStore } from "src/stores/settings";
import { validators } from "src/utils/validators";
import { ref } from "vue";
import SelectCurrency from "./../components/SelectCurrency.vue";

const $q = useQuasar();
const recordPaginationStore = useRecordPaginationSizeStore();
const paginationStore = usePaginationSizeStore();
const settingsStore = useSettingsStore();

const recordPaginationSize = ref(recordPaginationStore.recordPaginationSize);
const paginationSize = ref(paginationStore.paginationSize);
const defaultCurrencyId = ref(settingsStore.defaultCurrencyId);
const defaultView = ref(settingsStore.defaultView);
const rememberLastOpenedView = ref(settingsStore.rememberLastOpenedView);

function saveChangesClicked() {
  recordPaginationStore.setRecordPaginationSize(recordPaginationSize.value);
  paginationStore.setPaginationSize(paginationSize.value);
  settingsStore.setDefaultCurrencyId(defaultCurrencyId.value!);
  settingsStore.setDefaultView(defaultView.value!);
  settingsStore.setRememberLastOpenedView(rememberLastOpenedView.value);

  dialogService.notify(NotificationType.SUCCESS, "Settings saved.");
}
</script>

<style scoped lang="scss">
.local-control {
  max-width: 260px;
}

.control-group {
  background-color: rgb(244, 244, 244);
  margin: 12px;
}

.control-toggle {
  display: flex;
  justify-content: start;
  width: calc(100% - 16px);
  max-width: 300px;
  color: #3b3b3b;
}

.control-title {
  color: #3b3b3b;
}
</style>
