<script setup>
import Logo from '@/layouts/full/logo/LogoMain.vue';
import AuthLogin from './authForms/AuthLogin.vue';
import TextSlider from './auth1/TextSlider.vue';

import { createApp } from 'vue';
import { VueReCaptcha, useReCaptcha } from 'vue-recaptcha-v3';

const component = {
  setup() {
    const { executeRecaptcha, recaptchaLoaded } = useReCaptcha();

    const recaptcha = async () => {
      // (optional) Wait until recaptcha has been loaded.
      await recaptchaLoaded();

      // Execute reCAPTCHA with action "login".
      // Removed the assignment of token since it's not being used
      await executeRecaptcha('login');

      // Do stuff with the received token.
    };

    return {
      recaptcha
    };
  },
  template: '<button @click="recaptcha">Execute recaptcha</button>'
};

createApp(component).use(VueReCaptcha, { siteKey: '6LeCprcaAAAAAOD0aEK7WpfHc__CyRmk3rD-otNt' });
</script>

<template>
  <v-row class="h-screen bg-lightprimary" justify="center" align="center" no-gutters>
    <v-col cols="12" sm="8" md="6" lg="4">
      <v-card elevation="0" class="loginBox">
        <v-card variant="outlined">
          <v-card-text class="pa-9">
            <!--- Logo & Title -->
            <div class="text-center mb-6">
              <Logo />
              <h2 class="text-secondary text-h2 mt-4">Hi, Welcome Back</h2>
              <h4 class="text-disabled text-h4 mt-2">Login in to your account</h4>
            </div>
            <!--- Form -->
            <AuthLogin />
          </v-card-text>
        </v-card>
      </v-card>
    </v-col>
  </v-row>
</template>
<style lang="scss">
.loginBox {
  max-width: 475px;
  margin: 0 auto;
}
.cardAnimation {
  &:after {
    content: '';
    position: absolute;
    top: 32%;
    left: 40%;
    width: 313px;
    background-size: 380px;
    height: 280px;
    background-image: url('@/assets/images/auth/auth-purple-card.svg');
    background-repeat: no-repeat;
    background-position: center;
    animation: 15s wings ease-in-out infinite;
  }
  &:before {
    content: '';
    position: absolute;
    top: 23%;
    left: 37%;
    width: 243px;
    height: 210px;
    background-size: 380px;
    background-image: url('@/assets/images/auth/auth-blue-card.svg');
    background-repeat: no-repeat;
    background-position: center;
    animation: 15s wings ease-in-out infinite;
    animation-delay: 1s;
  }
}
.bgpattern {
  background: url('@/assets/images/auth/auth-pattern.svg') repeat;
}
</style>
