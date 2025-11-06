<script setup lang="ts">
import { ref, shallowRef } from 'vue';
// common components
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import UiChildCard from '@/components/shared/UiChildCard.vue';

// theme breadcrumb
const page = ref({ title: 'Treeview' });
const breadcrumbs = ref([
  {
    title: 'Advance',
    disabled: false,
    href: '#'
  },
  {
    title: 'Treeview',
    disabled: true,
    href: '#'
  }
]);

// common treeview data
const treeData = ref([
  {
    id: 1,
    title: 'Applications :',
    children: [
      { id: 2, title: 'Calendar : app' },
      { id: 3, title: 'Chrome : app' },
      { id: 4, title: 'Webstorm : app' }
    ]
  },
  {
    id: 5,
    title: 'Documents :',
    children: [
      {
        id: 6,
        title: 'vuetify :',
        children: [
          {
            id: 7,
            title: 'src :',
            children: [
              { id: 8, title: 'index : ts' },
              { id: 9, title: 'bootstrap : ts' }
            ]
          }
        ]
      },
      {
        id: 10,
        title: 'material2 :',
        children: [
          {
            id: 11,
            title: 'src :',
            children: [
              { id: 12, title: 'v-btn : ts' },
              { id: 13, title: 'v-card : ts' },
              { id: 14, title: 'v-window : ts' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 15,
    title: 'Downloads :',
    children: [
      { id: 16, title: 'October : pdf' },
      { id: 17, title: 'November : pdf' },
      { id: 18, title: 'Tutorial : html' }
    ]
  },
  {
    id: 19,
    title: 'Videos :',
    children: [
      {
        id: 20,
        title: 'Tutorials :',
        children: [
          { id: 21, title: 'Basic layouts : mp4' },
          { id: 22, title: 'Advanced techniques : mp4' },
          { id: 23, title: 'All about app : dir' }
        ]
      },
      { id: 24, title: 'Intro : mov' },
      { id: 25, title: 'Conference introduction : avi' }
    ]
  }
]);

// icon treeview data
const open = shallowRef(['public']);
const files = shallowRef<Record<string, string>>({
  html: '$languagehtml5',
  js: '$nodejs',
  json: '$codejson',
  md: '$languagemarkdown',
  pdf: '$filepdf',
  png: '$fileimage',
  txt: '$filedocumentoutline',
  xls: '$filexcel'
});

const items = [
  {
    title: '.git'
  },
  {
    title: 'node_modules'
  },
  {
    title: 'public',
    children: [
      {
        title: 'static',
        children: [
          {
            title: 'logo.png',
            file: 'png'
          }
        ]
      },
      {
        title: 'favicon.ico',
        file: 'png'
      },
      {
        title: 'index.html',
        file: 'html'
      }
    ]
  },
  {
    title: '.gitignore',
    file: 'txt'
  },
  {
    title: 'babel.config.js',
    file: 'js'
  },
  {
    title: 'package.json',
    file: 'json'
  },
  {
    title: 'README.md',
    file: 'md'
  },
  {
    title: 'vue.config.js',
    file: 'js'
  },
  {
    title: 'yarn.lock',
    file: 'txt'
  }
];

// filter data
const filteritems = [
  {
    id: 1,
    title: 'Vuetify Human Resources',
    children: [
      {
        id: 2,
        title: 'Core team',
        children: [
          {
            id: 201,
            title: 'John'
          },
          {
            id: 202,
            title: 'Kael'
          },
          {
            id: 203,
            title: 'Nekosaur'
          },
          {
            id: 204,
            title: 'Jacek'
          },
          {
            id: 205,
            title: 'Andrew'
          }
        ]
      },
      {
        id: 3,
        title: 'Administrators',
        children: [
          {
            id: 301,
            title: 'Blaine'
          },
          {
            id: 302,
            title: 'Yuchao'
          }
        ]
      },
      {
        id: 4,
        title: 'Contributors',
        children: [
          {
            id: 401,
            title: 'Phlow'
          },
          {
            id: 402,
            title: 'Brandon'
          },
          {
            id: 403,
            title: 'Sean'
          }
        ]
      }
    ]
  }
];

const denseopen = shallowRef([1, 19, 24, 25]);
const filteropen = shallowRef([1, 2]);
const search = shallowRef<string | undefined>('');
const caseSensitive = shallowRef(false);

function filter(value: string, search: string) {
  return caseSensitive.value ? value.indexOf(search) > -1 : value.toLowerCase().indexOf(search.toLowerCase()) > -1;
}

// customized treeview
const separateRoots = shallowRef(false);
const actionIcons = shallowRef(true);
const prependIcons = shallowRef(true);
const indentLines = shallowRef(true);

const customizefiles = shallowRef<Record<string, string>>({
  html: '$languagehtml5',
  js: '$nodejs',
  pdf: '$filepdf',
  png: '$fileimage',
  mov: '$videoOutline',
  mp4: '$videoOutline'
});

function getIcon(item: { title: string; children?: unknown }, isOpen: boolean): string {
  if (item.children) return isOpen ? '$folderopen' : '$folder';
  const parts = item.title.split('.');
  const ext = parts[parts.length - 1];
  return customizefiles.value[ext ?? ''] ?? '$fileoutline';
}

const items1 = [
  {
    id: 5,
    title: 'Documents',
    children: [
      {
        id: 6,
        title: 'vuetify',
        children: [
          {
            id: 7,
            title: 'src',
            children: [{ id: 8, title: 'index.js' }]
          }
        ]
      },
      {
        id: 101,
        title: 'material1',
        children: [
          {
            id: 111,
            title: 'src',
            children: [
              { id: 112, title: 'v-chip.js' },
              { id: 113, title: 'v-slider.js' }
            ]
          }
        ]
      },
      {
        id: 10,
        title: 'material2',
        children: [
          {
            id: 11,
            title: 'src',
            children: [
              { id: 12, title: 'v-btn.js' },
              { id: 13, title: 'v-card.js' },
              { id: 14, title: 'v-window.js' }
            ]
          }
        ]
      }
    ]
  }
];

const items2 = [
  {
    id: 115,
    title: 'Documents',
    children: [
      {
        id: 116,
        title: 'Financial',
        children: [{ id: 17, title: 'November.pdf' }]
      },
      {
        id: 117,
        title: 'Taxes',
        children: [
          { id: 118, title: 'December.pdf' },
          { id: 119, title: 'January.pdf' }
        ]
      },
      {
        id: 120,
        title: 'Later',
        children: [{ id: 121, title: 'Company logo.png' }]
      }
    ]
  },
  {
    id: 15,
    title: 'Downloads',
    children: [
      { id: 16, title: '2022-03-01 Report.pdf' },
      { id: 18, title: 'Tutorial.html' }
    ]
  },
  {
    id: 19,
    title: 'Videos',
    children: [
      {
        id: 20,
        title: 'Tutorials',
        children: [
          { id: 21, title: 'Basic layouts.mp4' },
          { id: 23, title: 'Empty folder', children: [] },
          { id: 22, title: 'Advanced techniques.mp4' }
        ]
      },
      { id: 24, title: 'Intro.mov' },
      { id: 25, title: 'Conference introduction.mov' }
    ]
  }
];
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Treeview">
        <v-row>
          <!-- Basic -->
          <v-col cols="12" md="6" lg="4">
            <UiChildCard title="Basic">
              <v-treeview :items="treeData" item-value="id" />
            </UiChildCard>
          </v-col>
          <!-- Activatable -->
          <v-col cols="12" md="6" lg="4">
            <UiChildCard title="Activatable">
              <v-treeview :items="treeData" item-value="id" activatable />
            </UiChildCard>
          </v-col>
          <!-- Color -->
          <v-col cols="12" md="6" lg="4">
            <UiChildCard title="Color">
              <v-treeview :items="treeData" item-value="id" color="warning" activatable />
            </UiChildCard>
          </v-col>
          <!-- Dense mode -->
          <v-col cols="12" md="6" lg="4">
            <UiChildCard title="Dense mode">
              <v-treeview v-model:opened="denseopen" :items="treeData" item-value="id" density="compact" activatable />
            </UiChildCard>
          </v-col>
          <!-- Append and prepend -->
          <v-col cols="12" md="6" lg="4">
            <UiChildCard title="Append and prepend">
              <v-treeview v-model:opened="open" :items="items" density="compact" item-value="title" activatable open-on-click>
                <template v-slot:prepend="{ item, isOpen }">
                  <v-icon v-if="!item.file" :icon="isOpen ? '$folderopen' : '$folder'" />

                  <v-icon v-else :icon="files[item.file]" />
                </template>
              </v-treeview>
            </UiChildCard>
          </v-col>
          <!-- Search and filter -->
          <v-col cols="12" md="6" lg="4">
            <UiChildCard title="Search and filter">
              <v-card class="mx-auto overflow-hidden" variant="outlined" rounded="sm" max-width="500">
                <v-sheet class="pa-4" color="gray100">
                  <v-text-field
                    v-model="search"
                    clear-icon="$closecircleoutline"
                    label="Search Company Directory"
                    variant="outlined"
                    clearable
                    flat
                    rounded="0"
                    hide-details
                  />

                  <v-checkbox-btn v-model="caseSensitive" class="mt-2" density="compact" label="Case sensitive search" />
                </v-sheet>

                <v-treeview
                  v-model:opened="filteropen"
                  :custom-filter="filter"
                  :items="filteritems"
                  :search="search"
                  item-value="id"
                  open-on-click
                >
                  <template v-slot:prepend="{ item }">
                    <v-icon v-if="item.children" :icon="`${item.id === 1 ? '$homevariant' : '$foldernetwork'}`" />
                  </template>
                </v-treeview>
              </v-card>
            </UiChildCard>
          </v-col>
          <!-- Customized Treeview -->
          <v-col cols="12">
            <UiChildCard title="Customized Treeview">
              <v-sheet class="px-sm-6 px-3 py-2 border-b" color="surface">
                <div class="d-flex gx-3 flex-wrap">
                  <div class="d-flex align-center ga-3">
                    <span class="mr-3">Lines:</span>
                    <v-chip-group v-model="indentLines" column>
                      <v-chip :value="false" text="none" filter label />
                      <v-chip :value="true" text="default" filter label />
                      <v-chip text="simple" value="simple" filter label />
                    </v-chip-group>
                  </div>
                  <v-spacer class="d-md-block d-none" />
                  <div class="d-flex align-center ga-md-6 ga-sm-4 ga-1 flex-wrap">
                    <v-switch v-model="actionIcons" color="success" density="comfortable" label="action icons" hide-details />
                    <v-switch v-model="prependIcons" color="success" density="comfortable" label="prepend icons" hide-details />
                    <v-switch
                      v-model="separateRoots"
                      :disabled="indentLines !== true"
                      color="success"
                      density="comfortable"
                      label="separate roots"
                      hide-details
                    />
                  </div>
                </div>
              </v-sheet>
              <v-row class="justify-center ga-lg-8 pt-4" fluid>
                <v-col cols="12" lg="4" md="6">
                  <v-treeview
                    :hide-actions="!actionIcons"
                    :indent-lines="indentLines"
                    :items="items1"
                    :separate-roots="separateRoots"
                    density="compact"
                    item-value="id"
                    max-width="400"
                    open-all
                    open-on-click
                  >
                    <template v-if="prependIcons" v-slot:prepend="{ item, isOpen }">
                      <v-icon :icon="getIcon(item, isOpen)" />
                    </template>
                  </v-treeview>
                </v-col>

                <v-col cols="12" lg="4" md="6">
                  <v-treeview
                    :hide-actions="!actionIcons"
                    :indent-lines="indentLines"
                    :items="items2"
                    :separate-roots="separateRoots"
                    density="compact"
                    item-value="id"
                    open-all
                    open-on-click
                  >
                    <template v-if="prependIcons" v-slot:prepend="{ item, isOpen }">
                      <v-icon :icon="getIcon(item, isOpen)" />
                    </template>
                  </v-treeview>
                </v-col>
              </v-row>
            </UiChildCard>
          </v-col>
        </v-row>
      </UiParentCard>
    </v-col>
  </v-row>
</template>

<style lang="scss">
.v-locale--is-rtl {
  .v-treeview-indent-lines {
    left: unset;
    right: 0;
    padding-left: unset;
    padding-right: 8px;
  }
  .v-treeview-indent-line--last-leaf {
    border-right-width: 1px;
    margin-right: calc(50% - 1px);
    border-left-width: 0;
    margin-left: 0;
    border-bottom-right-radius: 4px;
    border-bottom-left-radius: unset;
  }
  .v-treeview-indent-line--leaf,
  .v-treeview-indent-line--line {
    border-right-width: 1px;
    border-left-width: 0;
  }
  .v-treeview-indent-line--leaf-link {
    margin-left: 6px;
    margin-right: 0;
  }
}
</style>
