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
                <q-btn-dropdown size="md" color="primary" label="Use Template" split @click="useTemplateClicked(template)">
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

      <q-card-actions class="row justify-start">
        <q-btn color="blue-grey" label="Close" @click="cancelClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { QForm, useDialogPluginComponent, useQuasar } from "quasar";
import { Ref, ref } from "vue";
import { validators } from "src/utils/validators";
import { Collection, defaultPartyType, partyTypeList } from "src/constants/constants";
import { Party } from "src/models/party";
import { pouchdbService } from "src/services/pouchdb-service";
import { Record } from "src/models/record";
import { dialogService } from "src/services/dialog-service";

export default {
  props: {
    templateType: {
      type: String,
      required: false,
      default: null,
    },
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const $q = useQuasar();

    const isLoading = ref(false);

    const templateList: Ref<Record[]> = ref([]);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    async function loadData() {
      let rawDataRows = (await pouchdbService.listByCollection(Collection.RECORD_TEMPLATE)).docs as Record[];
      templateList.value = rawDataRows;
    }

    loadData();

    async function useTemplateClicked(template: Record) {
      onDialogOK(template);
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

    return {
      dialogRef,
      onDialogHide,
      cancelClicked: onDialogCancel,
      isLoading,
      partyTypeList,
      templateList,
      validators,
      useTemplateClicked,
      deleteTemplateClicked,
    };
  },
};
</script>
<style scoped lang="scss">
.template-container {
  display: flex;
  align-items: center;
}
</style>
