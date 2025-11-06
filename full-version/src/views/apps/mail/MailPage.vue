<script setup lang="ts">
import { ref } from 'vue';
import { useDisplay } from 'vuetify';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import MailSidebar from '@/components/apps/mail/MailSidebar.vue';
import MailListing from '@/components/apps/mail/MailListing.vue';

const page = ref({ title: 'Mail Page' });
const { lgAndUp } = useDisplay();
const breadcrumbs = ref([
  {
    title: 'Applications',
    disabled: false,
    href: '#'
  },
  {
    title: 'Mail',
    disabled: true,
    href: '#'
  }
]);
const toggleSide = ref(false);
const sDrawer = ref(false);
</script>
<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col v-if="!toggleSide && lgAndUp" class="d-flex align-stretch mailSidebar">
      <v-card variant="flat">
        <PerfectScrollbar style="height: calc(100vh - 300px)">
          <v-card-text class="pa-5">
            <MailSidebar />
          </v-card-text>
        </PerfectScrollbar>
      </v-card>
    </v-col>
    <v-col class="d-flex align-stretch overflow-auto">
      <v-card variant="flat">
        <!---Toggle Button For mobile-->
        <v-btn icon variant="text" class="d-lg-none d-md-flex d-sm-flex" @click="sDrawer = !sDrawer">
          <Menu2Icon size="20" />
        </v-btn>

        <div class="overflow-auto">
          <MailListing @s-toggle="toggleSide = !toggleSide" />
        </div>
      </v-card>
    </v-col>
  </v-row>

  <v-navigation-drawer v-if="!lgAndUp" v-model="sDrawer" temporary width="300" top>
    <PerfectScrollbar style="height: calc(100vh - 100px)">
      <v-card-text class="pa-5">
        <MailSidebar />
      </v-card-text>
    </PerfectScrollbar>
  </v-navigation-drawer>
</template>
<style lang="scss">
.custom-main {
  margin: 0;
}
.mailSidebar {
  max-width: 350px;
}
</style>
