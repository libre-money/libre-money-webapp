<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">Syncing Data</div>
        <div style="margin-left: 16px" v-if="!needsPasswordInput">
          <div style="text-align: center">
            <q-spinner color="primary" size="40px" :thickness="4" />
          </div>
        </div>
        <q-form @submit="onSubmit" class="q-gutter-md q-pa-md" v-if="needsPasswordInput">
          <q-input
            type="password"
            filled
            v-model="password"
            :label="`Your password for ${username}`"
            :hint="`Your password for ${username}`"
            lazy-rules
            :rules="validators.password"
          />
          <div></div>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="warning" label="Abort" @click="cancelClicked" />
        <q-btn label="Confirm and Sync" color="primary" v-if="needsPasswordInput" @click="onSubmit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
import { partyTypeList } from "src/constants/constants";
import { authService } from "src/services/auth-service";
import { credentialService } from "src/services/credential-service";
import { dialogService } from "src/services/dialog-service";
import { migrationService } from "src/services/migration-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { useUserStore } from "src/stores/user";
import { validators } from "src/utils/validators";
import { Ref, ref } from "vue";

export default {
  props: {
    bidirectional: {
      type: Boolean,
      required: false,
      default: true,
    },
  },

  components: {},

  emits: [...useDialogPluginComponent.emits],

  setup() {
    const isLoading = ref(false);

    const userStore = useUserStore();

    const needsPasswordInput = ref(false);
    const username: Ref<string | null> = ref(null);
    const password: Ref<string | null> = ref(null);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    const $q = useQuasar();

    isLoading.value = true;

    isLoading.value = false;

    async function okClicked() {
      onDialogOK();
    }

    async function sync() {
      needsPasswordInput.value = false;
      if (!credentialService.hasCredentials()) {
        if (!userStore.isUserLoggedIn) {
          window.location.reload();
          return;
        }
        username.value = userStore.currentUser!.username;
        needsPasswordInput.value = true;
        console.debug("Asking user to input password again");
        return;
      }

      try {
        let errorCount = (await pouchdbService.sync()) as number;

        if (errorCount > 0) {
          await dialogService.alert("Sync Ended", `Sync ended with ${errorCount} non-fatal errors. Please inform administrator to avoid data loss.`);
        }

        await migrationService.migrateDefaultExpenseAvenueAndIncomeSource($q);

        // FIXME: Remove hack
        window.location.reload();
        onDialogCancel();
      } catch (error) {
        await dialogService.alert("Sync Error", "Encountered error while trying to sync with remote. Ensure you have working internet connection");
      }
    }

    async function onSubmit() {
      let [successful, failureReason] = await authService.updateAndTestCredentials(username.value!, password.value!);
      if (!successful) {
        await dialogService.alert("Credentials Error", failureReason as string);
        return;
      }
      console.debug("Loaded new credentials. Reinitating sync.");

      await sync();
    }

    sync();

    return {
      dialogRef,
      onDialogHide,
      okClicked,
      cancelClicked: onDialogCancel,
      isLoading,
      partyTypeList,
      validators,
      username,
      password,
      onSubmit,
      needsPasswordInput,
    };
  },
};
</script>
<style scoped lang="scss"></style>
