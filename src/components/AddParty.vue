<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingPartyId ? "Editing a Party" : "Adding a Party" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="partyForm">
          <q-input filled v-model="partyName" label="Name of the Party/Vendor" lazy-rules :rules="validators.name" />
          <q-select filled v-model="partyType" :options="partyTypeList" label="Type" emit-value map-options />
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Ref, ref } from "vue";
import { validators } from "src/utils/validators";
import { Collection, defaultPartyType, partyTypeList } from "src/constants/constants";
import { Party } from "src/models/party";
import { pouchdbService } from "src/services/pouchdb-service";

export default {
  props: {
    existingPartyId: {
      type: String,
      required: false,
      default: null,
    },
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    let initialDoc: Party | null = null;

    const isLoading = ref(false);

    const partyForm: Ref<QForm | null> = ref(null);

    const partyName: Ref<string | null> = ref(null);
    const partyType: Ref<string | null> = ref(partyTypeList.find((partyType) => partyType.value === defaultPartyType)!.value);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    if (props.existingPartyId) {
      isLoading.value = true;
      (async function () {
        let res = (await pouchdbService.getDocById(props.existingPartyId)) as Party;
        initialDoc = res;
        partyName.value = res.name;
        partyType.value = res.type;
        isLoading.value = false;
      })();
    }
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

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      partyTypeList,
      partyName,
      partyType,
      validators,
      partyForm,
    };
  },
};
</script>
<style scoped lang="ts"></style>
