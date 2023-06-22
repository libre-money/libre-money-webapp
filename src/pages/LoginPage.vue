<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="login-card">
      <div class="app-name q-pa-xs">Cash Keeper</div>
      <div class="title q-pa-xs">Login</div>
      <q-form @submit="onSubmit" @reset="onReset" class="q-gutter-md q-pa-md">
        <q-input filled v-model="username" label="Username" hint="Your username" lazy-rules
          :rules="validators.username" />

        <q-input type="password" filled v-model="password" label="Password" hint="Your password" lazy-rules
          :rules="validators.password" />

        <div>
          <q-btn label="Login" type="submit" color="primary" />
          <q-btn label="Reset" type="reset" color="primary" flat class="q-ml-sm" />
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>
  
<script lang="ts">

import { useQuasar } from "quasar";
import { validators } from "src/utils/validators";
import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "IndexPage",
  components: {},
  mounted() {
    // let db = new PouchDB("AAAA")
    // console.log(db);
  },
  setup() {
    const $q = useQuasar();

    const username = ref(null);
    const password = ref(null);

    return {
      validators,
      username,
      password,

      onSubmit() {

        $q.notify({
          color: "green-4",
          textColor: "white",
          icon: "cloud_done",
          message: "Submitted"
        });

      },

      onReset() {
        username.value = null;
        password.value = null;
      }


    };
  }
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
  background-color: antiquewhite;
  text-transform: uppercase;
  font-size: 20px;
  // padding-bottom: 8px;/
}

.login-card {
  min-width: 300px;
  max-width: 600px;
  margin: 12px;
}
</style>