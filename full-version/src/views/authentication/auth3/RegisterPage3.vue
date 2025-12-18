<script setup lang="ts">
import Logo from '@/layouts/full/logo/LogoMain.vue';
import AuthRegister from '../authForms/AuthRegister.vue';
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
              <h2 class="text-secondary text-h2 mt-4">Sign up</h2>
              <h4 class="text-disabled text-h4 mt-2">Enter credentials to continue</h4>
            </div>
            <!--- Form -->
            <AuthRegister />
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
    top: 45%;
    left: 35%;
    width: 260px;
    background-size: 380px;
    height: 290px;
    background-image: url('@/assets/images/auth/auth-signup-white-card.svg');
    background-repeat: no-repeat;
    background-position: center;
    animation: 15s wings ease-in-out infinite;
  }

  &:before {
    content: '';
    position: absolute;
    top: 12%;
    left: 25%;
    width: 360px;
    height: 350px;
    background-size: 460px;
    background-image: url('@/assets/images/auth/auth-signup-blue-card.svg');
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
