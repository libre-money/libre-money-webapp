<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Application Settings</div>
        <q-btn color="primary" text-color="white" label="Save Changes" @click="saveChangesClicked" icon="save" />
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
        <div class="local-control">
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
            standout="bg-primary text-white"
            v-model="defaultView"
            :options="defaultViewOptionList"
            label="Default View"
            emit-value
            map-options
            class="std-margin-bottom-32"
          />
        </div>
      </div>

      <div class="q-pa-md control-group theme-control-group">
        <div class="control-title" style="margin-bottom: 16px">Choose your preferred theme</div>
        <div class="theme-options-container">
          <div class="theme-radio-wrapper" :class="{ 'theme-radio-wrapper--checked': darkMode === false }" @click="handleThemeOptionClick(false)">
            <q-radio v-model="darkMode" :val="false" color="primary" class="theme-radio" @update:model-value="handleThemeChange" />
            <div class="theme-option-label">
              <q-icon name="light_mode" size="20px" />
              <span>Light</span>
            </div>
          </div>
          <div class="theme-radio-wrapper" :class="{ 'theme-radio-wrapper--checked': darkMode === true }" @click="handleThemeOptionClick(true)">
            <q-radio v-model="darkMode" :val="true" color="primary" class="theme-radio" @update:model-value="handleThemeChange" />
            <div class="theme-option-label">
              <q-icon name="dark_mode" size="20px" />
              <span>Dark</span>
            </div>
          </div>
          <div class="theme-radio-wrapper" :class="{ 'theme-radio-wrapper--checked': darkMode === null }" @click="handleThemeOptionClick(null)">
            <q-radio v-model="darkMode" :val="null" color="primary" class="theme-radio" @update:model-value="handleThemeChange" />
            <div class="theme-option-label">
              <q-icon name="brightness_auto" size="20px" />
              <span>System Default</span>
            </div>
          </div>
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar, setCssVar } from "quasar";
import { defaultViewOptionList } from "src/constants/constants";
import { PRIMARY_DARK, PRIMARY_LIGHT } from "src/constants/theme-constants";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { useRecordPaginationSizeStore } from "src/stores/record-pagination";
import { useSettingsStore } from "src/stores/settings";
import { validators } from "src/utils/validators";
import { ref, watch } from "vue";
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

// Theme control - use saved preference or null for system preference
// Initialize with saved preference, or null if no explicit preference
const darkMode = ref<boolean | null>(settingsStore.darkMode);

function handleThemeChange(value: boolean | null) {
  if (value === null) {
    // System preference - check system preference
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    $q.dark.set(prefersDark);
    settingsStore.setDarkMode(null);
    setCssVar("primary", prefersDark ? PRIMARY_DARK : PRIMARY_LIGHT);
  } else {
    // Explicit light or dark
    $q.dark.set(value);
    settingsStore.setDarkMode(value);
    setCssVar("primary", value ? PRIMARY_DARK : PRIMARY_LIGHT);
  }
}

function handleThemeOptionClick(value: boolean | null) {
  darkMode.value = value;
  handleThemeChange(value);
}

// Watch for external dark mode changes (e.g., from header toggle) and update the ref
watch(
  () => settingsStore.darkMode,
  (newValue) => {
    darkMode.value = newValue;
  }
);

function saveChangesClicked() {
  recordPaginationStore.setRecordPaginationSize(recordPaginationSize.value);
  paginationStore.setPaginationSize(paginationSize.value);
  settingsStore.setDefaultCurrencyId(defaultCurrencyId.value!);
  settingsStore.setDefaultView(defaultView.value!);
  settingsStore.setRememberLastOpenedView(rememberLastOpenedView.value);
  // Dark mode is saved immediately when changed, so no need to save here

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
  border-radius: 16px;
  transition: background-color 0.2s ease;
}

// Material 3 compliant dark mode support for control groups
body.body--dark .control-group {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.control-toggle {
  display: flex;
  justify-content: start;
  width: calc(100% - 16px);
  max-width: 300px;
  color: #3b3b3b;
}

body.body--dark .control-toggle {
  color: #e2e8f0;
}

.control-title {
  color: #3b3b3b;
  font-weight: 500;
  font-size: 14px;
  line-height: 20px;
}

body.body--dark .control-title {
  color: #e2e8f0;
}

// Theme control group specific styling
.theme-control-group {
  .theme-options-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 400px;
  }

  .theme-radio-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    background-color: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.08);
    cursor: pointer;

    &:hover {
      background-color: rgba(0, 0, 0, 0.04);
      border-color: rgba(0, 0, 0, 0.12);
    }

    &.theme-radio-wrapper--checked {
      background-color: rgba(var(--q-primary-rgb), 0.12);
      border-color: var(--q-primary);
      box-shadow: 0 1px 3px rgba(var(--q-primary-rgb), 0.2);
    }
  }

  .theme-option-label {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
    color: #3b3b3b;
    flex: 1;
  }

  .theme-radio {
    margin: 0;
    flex-shrink: 0;

    :deep(.q-radio__check) {
      color: var(--q-primary);
    }
  }
}

// Dark mode theme option styling
body.body--dark .theme-control-group {
  .theme-option-label {
    color: #e2e8f0;
  }

  .theme-radio-wrapper {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);

    &:hover {
      background-color: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
    }

    &.theme-radio-wrapper--checked {
      background-color: rgba(var(--q-primary-rgb), 0.25);
      border-color: var(--q-primary);
      box-shadow: 0 1px 3px rgba(var(--q-primary-rgb), 0.3);
    }
  }
}
</style>
