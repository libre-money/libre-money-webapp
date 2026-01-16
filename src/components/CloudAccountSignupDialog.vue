<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" :persistent="isSubmitting">
    <q-card class="q-dialog-plugin" style="min-width: 400px; max-width: 500px">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <q-icon name="cloud" size="32px" color="primary" class="q-mr-md" />
          <div class="text-h6 text-weight-medium">Free Cloud Trial</div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pt-md">
        <q-banner class="bg-blue-1 text-blue-9 q-mb-md" rounded>
          <template v-slot:avatar>
            <q-icon name="info" color="blue" size="20px" />
          </template>
          <div class="text-body2">Enjoy <strong>3 months free</strong> of our cloud hosting service as our early adopter offer.</div>
        </q-banner>

        <div class="text-body2 text-grey-8 q-mb-lg q-mt-lg">
          After the free period, basic pricing starts at just <strong>$24 USD for 2 entire years</strong>.
        </div>
        <div class="text-body2 text-grey-8 q-pb-lg">We try to provide our services near or at cost.</div>

        <q-form ref="signupForm" @submit="onSubmit" class="q-gutter-md">
          <q-input
            standout="bg-primary text-white"
            v-model="fullName"
            label="Full Name"
            placeholder="Enter your full name"
            lazy-rules
            :rules="validators.name"
            :disable="isSubmitting"
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <q-input
            standout="bg-primary text-white"
            v-model="email"
            label="Email Address"
            placeholder="Enter your email"
            type="email"
            lazy-rules
            :rules="validators.email"
            :disable="isSubmitting"
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>
        </q-form>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Maybe Later" color="grey-7" @click="onCancel" :disable="isSubmitting" />
        <q-btn unelevated color="primary" label="Sign Up" @click="onSubmit" :loading="isSubmitting" :disable="!isFormValid" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { ref, computed, onMounted } from "vue";
import { validators } from "src/utils/validators";
import { useUserStore } from "src/stores/user";
import { dialogService, NotificationType } from "src/services/dialog-service";
import { authService } from "src/services/auth-service";

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const userStore = useUserStore();

const signupForm = ref<QForm | null>(null);
const fullName = ref("");
const email = ref("");
const isSubmitting = ref(false);

// Prefill email from user store if available
onMounted(() => {
  const currentUser = userStore.currentUser;
  if (currentUser?.cloudAccountEmail) {
    email.value = currentUser.cloudAccountEmail;
  }
});

const isFormValid = computed(() => {
  return fullName.value.trim().length > 0 && email.value.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
});

async function onSubmit() {
  if (!signupForm.value) return;

  const isValid = await signupForm.value.validate();
  if (!isValid) return;

  isSubmitting.value = true;

  try {
    const [success, response, error] = await authService.submitLaunchPromoSignup(email.value, fullName.value);

    if (!success || !response) {
      await dialogService.alert("Signup Error", error || "There was an error processing your signup. Please try again later.");
      return;
    }

    // Track that the user has signed up and store their email
    const currentUser = userStore.currentUser;
    if (currentUser) {
      const emailValue = email.value.trim().toLowerCase();
      const updatedUser = {
        ...currentUser,
        hasSignedUpForCloudAccount: true,
        cloudAccountEmail: emailValue,
      };
      userStore.setUser(updatedUser);
    }

    const message = response.wasAlreadyRegistered
      ? "You're already registered! Your account details will be sent to your email."
      : "Thank you! Your account details will be sent to your email.";
    dialogService.notify(NotificationType.SUCCESS, message);
    onDialogOK();
  } catch (error) {
    console.error("Error submitting cloud account signup:", error);
    await dialogService.alert("Signup Error", "There was an error processing your signup. Please try again later.");
  } finally {
    isSubmitting.value = false;
  }
}

function onCancel() {
  onDialogCancel();
}
</script>

<style scoped lang="scss">
.q-dialog-plugin {
  .q-card-section {
    .text-body2 {
      line-height: 1.6;
    }
  }
}
</style>
