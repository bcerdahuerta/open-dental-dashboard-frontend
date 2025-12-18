<script setup lang="ts">
import Logo from '@/layouts/full/logo/LogoMain.vue';
import AuthForgotPwd from '../authForms/AuthForgotPwd.vue';
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
              <h2 class="text-secondary text-h2 mt-8">Forgot password?</h2>
              <h4 class="text-disabled text-h4 mt-3">Enter credentials to continue</h4>
            </div>
            
            <h4 class="text-h4 my-4 mb-8 font-weight-regular text-medium-emphasis text-center">
              Enter your email address below and we'll send you password reset OTP.
            </h4>
            <AuthForgotPwd />
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
    top: 18%;
    left: 18%;
    background-size: 600px;
    width: 500px;
    height: 470px;
    background-image: url('@/assets/images/auth/auth-forgot-pass-multi-card.svg');
    background-repeat: no-repeat;
    background-position: center;
    animation: 15s wings ease-in-out infinite;
  }
}

.bgpattern {
  background: url('@/assets/images/auth/auth-pattern.svg') repeat;
}
</style>
