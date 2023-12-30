<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="login-card">
      <div class="app-name q-pa-xs"><img class="logo" src="icons/logo.png" alt="CK" />Cash Keeper</div>
      <div class="title q-pa-xs">Login</div>
      <q-form ref="loginForm" @submit="onSubmit" @reset="onReset" class="q-gutter-md q-pa-md">
        <q-input filled v-model="domain" label="Domain" hint="Your domain" lazy-rules :rules="validators.domain" />

        <q-input filled v-model="username" label="Username" hint="Your username" lazy-rules :rules="validators.username" />

        <q-input type="password" filled v-model="password" label="Password" hint="Your password" lazy-rules :rules="validators.password" />

        <q-checkbox v-model="shouldRememberPassword" label="Store password on this device" />

        <div>
          <q-btn label="Login" type="submit" color="primary" />
          <q-btn label="Reset" type="reset" color="primary" flat class="q-ml-sm" />
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { QForm, dom, useQuasar } from "quasar";
import { configService } from "src/services/config-service";
import { dialogService } from "src/services/dialog-service";
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

    const domain: Ref<string | null> = ref(configService.getDomainName(false));

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

        configService.setDomainName(domain.value || "");

        isLoading.value = true;
        let [successful, failureReason] = await loginService.login(username.value!, password.value!, shouldRememberPassword.value);
        isLoading.value = false;

        if (!successful) {
          await dialogService.alert("Login Error", failureReason as string);
          return;
        }

        $q.notify({
          color: "green-4",
          textColor: "white",
          icon: "cloud_done",
          message: "Successfully logged in!",
        });

        if (route.query && route.query.next) {
          await router.push(route.query.next as RouteLocationRaw);
        } else {
          await router.push("/");
        }
      },

      onReset() {
        username.value = null;
        password.value = null;
      },
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
