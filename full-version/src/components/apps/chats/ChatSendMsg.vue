<script setup lang="ts">
import { ref } from 'vue';
import { useChatStore } from '@/stores/apps/chat';

const msg = ref('');
const store = useChatStore();

function addItemAndClear(item: string) {
  if (item.length === 0) {
    return;
  }
  store.sendMsg(store.chatContent + 1, msg.value);
  msg.value = '';
}
</script>

<template>
  <form class="d-flex align-center ga-2 pa-4" @submit.prevent="addItemAndClear(msg)">
    <v-btn icon variant="text" size="small"><MoodSmileIcon size="20" /></v-btn>

    <v-text-field variant="outlined" hide-details v-model="msg" color="primary" label="Type a Message"></v-text-field>
    <v-btn icon variant="text" size="small"><PaperclipIcon size="20" /></v-btn>
    <v-btn icon variant="text" size="small" color="primary" type="submit">
      <SendIcon size="20" />
    </v-btn>
  </form>
</template>
