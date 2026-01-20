<template>
  <div class="demo-preparation q-pa-md">
    <q-card class="demo-card std-card">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">
          <span>Demo Preparation Mode</span>
        </div>
        <div class="text-subtitle2">This component is only visible when VITE_DEMO_PREPARATION_ENABLED=true</div>
      </q-card-section>

      <q-card-section>
        <div class="text-body1 q-mb-md">
          This component is designed for demo purposes and contains various tools and configurations to help prepare and
          showcase the application.
        </div>

        <q-separator class="q-my-md" />

        <div class="demo-tools">
          <div class="text-h6 q-mb-md">Demo Tools</div>

          <q-card class="demo-tool-card" flat bordered>
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">
                <q-icon name="data_object" color="primary" class="q-mr-sm" />
                Additional Demo Data Generator
              </div>
              <div class="text-caption q-mb-md">Generate additional demo data that complements onboarding data</div>
              <div class="row q-gutter-sm">
                <q-btn color="primary" label="Generate Additional Demo Data" @click="generateSampleData"
                  :loading="generatingData" />
                <q-btn color="negative" label="Clear Demo Data" @click="clearDemoData" :loading="clearingData" />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <q-separator class="q-my-md" />

        <div class="demo-status">
          <div class="text-h6 q-mb-md">Demo Status</div>
          <q-list bordered>
            <q-item>
              <q-item-section avatar>
                <q-icon name="check_circle" color="positive" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Demo Preparation Component Loaded</q-item-label>
                <q-item-label caption>Component successfully loaded and initialized</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar>
                <q-icon name="info" color="info" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Environment Variable</q-item-label>
                <q-item-label caption>VITE_DEMO_PREPARATION_ENABLED={{ demoPreparationEnabled }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat color="primary" label="Close" @click="$emit('close')" />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useQuasar } from "quasar";
import { DEMO_PREPARATION_ENABLED } from "src/constants/config-constants";
import { demoPreparationService } from "src/services/demo-preparation-service";

// Props and emits
defineEmits<{
  close: [];
}>();

// Quasar instance
const $q = useQuasar();

// Reactive data
const generatingData = ref(false);
const clearingData = ref(false);

// Computed properties
const demoPreparationEnabled = computed(() => DEMO_PREPARATION_ENABLED);

// Methods
const generateSampleData = async () => {
  generatingData.value = true;

  try {
    // Generate sample data using the service
    await demoPreparationService.setupAllDemoData();

    // Get the count of created entities
    const counts = demoPreparationService.getCreatedEntitiesCount();

    $q.notify({
      type: "positive",
      message: `Additional demo data generated successfully! Created ${counts.currencies} currencies, ${counts.wallets} wallets, ${counts.parties} parties, ${counts.assets} assets, ${counts.expenseAvenues} expense avenues, ${counts.incomeSources} income sources, ${counts.tags} tags, ${counts.records} records, and ${counts.budgets} budgets.`,
      position: "top",
      timeout: 5000,
    });
  } catch (error) {
    console.error("Failed to generate sample data:", error);
    $q.notify({
      type: "negative",
      message: `Failed to generate sample data: ${error instanceof Error ? error.message : "Unknown error"}`,
      position: "top",
      timeout: 5000,
    });
  } finally {
    generatingData.value = false;
  }
};

const clearDemoData = async () => {
  clearingData.value = true;

  try {
    // Clear demo data using the service
    await demoPreparationService.clearAllDemoData();

    $q.notify({
      type: "positive",
      message: "Demo data cleared successfully!",
      position: "top",
    });
  } catch (error) {
    console.error("Failed to clear demo data:", error);
    $q.notify({
      type: "negative",
      message: `Failed to clear demo data: ${error instanceof Error ? error.message : "Unknown error"}`,
      position: "top",
      timeout: 5000,
    });
  } finally {
    clearingData.value = false;
  }
};
</script>

<style scoped>
.demo-card {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.demo-tools {
  margin-bottom: 2rem;
}

.demo-tool-card {
  max-width: 400px;
  transition: transform 0.2s ease;
}

.demo-tool-card:hover {
  transform: translateY(-2px);
}

.demo-status {
  margin-bottom: 1rem;
}

.text-h6 {
  font-weight: 600;
  color: #1976d2;
}

.text-subtitle1 {
  font-weight: 500;
}

.text-caption {
  color: #666;
  line-height: 1.4;
}
</style>
