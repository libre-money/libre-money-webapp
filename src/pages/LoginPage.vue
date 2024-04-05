<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="login-card">
      <div class="app-name q-pa-xs"><img class="logo" src="icons/logo.png" alt="CK" />Cash Keeper</div>
      <div class="title q-pa-xs">Login</div>
      <q-form ref="loginForm" @submit="onSubmit" class="q-gutter-md q-pa-md">
        <q-input filled v-model="domain" label="Domain" hint="Your domain" lazy-rules :rules="validators.domain" />

        <q-input filled v-model="username" label="Username" hint="Your username" lazy-rules
          :rules="validators.username" />

        <q-input type="password" filled v-model="password" label="Password" hint="Your password" lazy-rules
          :rules="validators.password" />

        <q-checkbox v-model="shouldRememberPassword" label="Store password on this device" />

        <div class="row">
          <q-btn label="Reset Local Data" type="button" color="grey" flat class="q-ml-sm"
            @click="removeLocalDataClicked" />
          <div class="spacer"></div>
          <q-btn label="Login" type="submit" color="primary" />
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { QForm, useQuasar } from "quasar";
import { configService } from "src/services/config-service";
import { NotificationType, dialogService } from "src/services/dialog-service";
import { localDataService } from "src/services/local-data-service";
import { loginService } from "src/services/login-service";
import { validators } from "src/utils/validators";
import { Ref, defineComponent, ref } from "vue";
import { RouteLocationRaw, useRoute, useRouter } from "vue-router";

export default defineComponent({
  name: "IndexPage",
  components: {},
  setup() {
    const $q = useQuasar();
    const route = useRoute();
    const router = useRouter();

    const isLoading = ref(false);

    const loginForm: Ref<QForm | null> = ref(null);

    const previousDomainName = configService.getDomainName(false);
    const domain: Ref<string | null> = ref(previousDomainName);

    const username: Ref<string | null> = ref(null);
    const password: Ref<string | null> = ref(null);

    const shouldRememberPassword: Ref<boolean> = ref(false);

    return {
      validators,
      domain,
      username,
      password,
      loginForm,
      shouldRememberPassword,

      async onSubmit() {
        const isValid = await loginForm.value!.validate();
        if (!isValid) return;

        if (previousDomainName && previousDomainName !== domain.value) {
          const message = `Your new domain ${domain.value} is different from ${previousDomainName}. 
          If you continue with this login, your data from ${previousDomainName} will be copied over to ${domain.value} once you sync. Continue?`;
          const answerContinue = await dialogService.confirm("Please confirm", message);
          if (!answerContinue) {
            const message = "Hint: to clear local data on this device use the \"Reset Local Data\" button";
            await dialogService.alert("Login aborted", message);
            return;
          }
        }

        configService.setDomainName(domain.value || "");

        isLoading.value = true;
        let [successful, failureReason] = await loginService.login(username.value!, password.value!, shouldRememberPassword.value);
        isLoading.value = false;

        if (!successful) {
          await dialogService.alert("Login Error", failureReason as string);
          return;
        }

        dialogService.notify(NotificationType.LOGIN, "Successfully logged in.");

        if (route.query && route.query.next) {
          await router.push(route.query.next as RouteLocationRaw);
        } else {
          await router.push("/");
        }
      },

      async removeLocalDataClicked() {
        domain.value = null;
        username.value = null;
        password.value = null;
        localDataService.removeLocalData();
      }
    };
  },
});
</script>

<style scoped lang="scss">
.title {
  text-align: center;
  background-color: rgb(105, 187, 79);
  text-transform: uppercase;
  font-size: 26px;
  // padding-top: 8px;
}

.app-name {
  text-align: center;
  background-color: rgb(35, 35, 35);
  color: white;
  text-transform: uppercase;
  font-size: 20px;

  display: flex;
  align-items: center;
  justify-content: center;

  .logo {
    margin-right: 8px;
    margin-bottom: 4px;
    width: 40px;
    height: 40px;
  }
}

.login-card {
  min-width: 300px;
  max-width: 600px;
  margin: 12px;
}
</style>
