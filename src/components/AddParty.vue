<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss :maximized="$q.screen.lt.sm">
    <q-card class="q-dialog-plugin column full-height">
      <q-card-section class="no-shrink">
        <div class="std-dialog-title text-primary text-weight-bold">{{ existingPartyId ? "Editing a Party" : "Adding a Party" }}</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="col scroll" style="min-height: 0">
        <q-form class="q-gutter-md" ref="partyForm">
          <q-input hide-bottom-space standout="bg-primary text-white" v-model="partyName" label="Name of the Party/Vendor" lazy-rules :rules="validators.name" />
          <q-select standout="bg-primary text-white" v-model="partyType" :options="partyTypeList" label="Type" emit-value map-options />
        </q-form>
      </q-card-section>
      <q-separator />
      <q-card-section class="no-shrink">
        <div class="flex">
          <q-btn flat rounded size="lg" label="Cancel" @click="cancelClicked" />
          <div class="spacer"></div>
          <q-btn rounded size="lg" color="primary" :label="existingPartyId ? 'Update' : 'Add'" @click="okClicked" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent, useQuasar } from "quasar";
import { ref, onMounted } from "vue";
import { validators } from "src/utils/validators";
import { Collection, defaultPartyType, partyTypeList } from "src/constants/constants";
import { Party } from "src/models/party";
import { pouchdbService } from "src/services/pouchdb-service";

// Props
const props = defineProps<{
  existingPartyId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const $q = useQuasar();

// State
let initialDoc: Party | null = null;

const isLoading = ref(false);

const partyForm = ref<QForm | null>(null);

const partyName = ref<string | null>(null);
const partyType = ref<string | null>(partyTypeList.find((partyType) => partyType.value === defaultPartyType)!.value);

// Load existing party if editing
onMounted(() => {
  if (props.existingPartyId) {
    isLoading.value = true;
    (async function () {
      if (props.existingPartyId) {
        let res = (await pouchdbService.getDocById(props.existingPartyId)) as Party;
        initialDoc = res;
        partyName.value = res.name;
        partyType.value = res.type;
        isLoading.value = false;
      }
    })();
  }
});

async function okClicked() {
  if (!(await partyForm.value?.validate())) {
    return;
  }

  let party: Party = {
    $collection: Collection.PARTY,
    name: partyName.value!,
    type: partyType.value!,
  };

  if (initialDoc) {
    party = Object.assign({}, initialDoc, party);
  }

  pouchdbService.upsertDoc(party);

  onDialogOK();
}

function cancelClicked() {
  onDialogCancel();
}
</script>
<style scoped lang="scss"></style>
