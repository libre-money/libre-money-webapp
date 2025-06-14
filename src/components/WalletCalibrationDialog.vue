<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title" style="margin-bottom: 12px">Calibrate Wallet</div>

        <div class="wallet-calibration-content">Wallet: {{ wallet.name }}</div>
      </q-card-section>

      <q-card-actions class="row justify-start std-bottom-action-row">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <div class="spacer"></div>
        <q-btn color="primary" label="Save" @click="saveClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { useDialogPluginComponent } from "quasar";
import { Ref } from "vue";

export default {
  props: {
    wallet: {
      type: Object,
      required: true,
    },
  },

  emits: [...useDialogPluginComponent.emits],

  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    function saveClicked() {
      onDialogOK();
    }

    console.debug({ props });

    return {
      dialogRef,
      onDialogHide,
      saveClicked,
      cancelClicked: onDialogCancel,
    };
  },
};
</script>

<style scoped lang="scss">
.wallet-calibration-content {
  padding: 16px 0;
}
</style>
