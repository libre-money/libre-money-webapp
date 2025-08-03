<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">Select a Template</div>

        <div class="q-gutter-md q-pa-md">
          <template v-if="!isLoading">
            <div v-for="template in templateList" class="template-row" v-bind:key="template._id">
              <div class="template-container">
                <div>{{ template.templateName }}</div>
                <div class="spacer"></div>
                <q-btn-dropdown size="md" color="primary" label="Use" split @click="useTemplateClicked(template)" style="margin-left: 8px">
                  <q-list>
                    <q-item clickable v-close-popup @click="deleteTemplateClicked(template)">
                      <q-item-section>
                        <q-item-label>Delete Template</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-btn-dropdown>
              </div>
            </div>
          </template>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-start std-bottom-action-row">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <div class="spacer"></div>
        <q-btn color="secondary" label="Manage Templates" @click="manageClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
import { Collection } from "src/constants/constants";
import { Record } from "src/models/record";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { ref } from "vue";
import { useRouter } from "vue-router";

// Props
defineProps<{
  templateType?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

const $q = useQuasar();
const router = useRouter();

const isLoading = ref(false);
const templateList = ref<Record[]>([]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

async function loadData() {
  let rawDataRows = (await pouchdbService.listByCollection(Collection.RECORD_TEMPLATE)).docs as Record[];
  rawDataRows.sort((a, b) => a.templateName?.localeCompare(b.templateName || "") || 0);
  templateList.value = rawDataRows;
}

loadData();

async function useTemplateClicked(template: Record) {
  onDialogOK(template);
}

function manageClicked() {
  router.push({ name: "templates" });
}

async function deleteTemplateClicked(template: Record) {
  let answer = await dialogService.confirm("Delete Template", `Are you sure you want to permanently delete the template "${template.templateName}"`);
  if (!answer) return;

  let res = await pouchdbService.removeDoc(template);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to remove the template.");
  }

  loadData();
}

function cancelClicked() {
  onDialogCancel();
}
</script>
<style scoped lang="scss">
.template-container {
  display: flex;
  align-items: center;
}
</style>
