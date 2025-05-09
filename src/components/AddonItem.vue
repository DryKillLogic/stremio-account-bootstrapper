<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true
  },
  idx: {
    type: Number,
    required: true
  },
  manifestURL: {
    type: String,
    required: true
  },
  logoURL: {
    type: String,
    required: false
  },
  isDeletable: {
    type: Boolean,
    required: false,
    default: true
  },
  isConfigurable: {
    type: Boolean,
    required: false,
    default: false
  }
});

const emits = defineEmits(['delete-addon', 'edit-manifest']);

const defaultLogo = 'https://icongr.am/feather/box.svg?size=48&color=ffffff';

function copyManifestURLToClipboard() {
  navigator.clipboard
    .writeText(props.manifestURL)
    .then(() => {
      console.log('Text copied to clipboard');
    })
    .catch((error) => {
      console.error('Error copying text to clipboard', error);
    });
}

function removeAddon() {
  emits('delete-addon', props.idx);
}

function openEditManifestModal() {
  emits('edit-manifest', props.idx);
}
</script>

<template>
  <div class="item">
    <div class="col-8">
      <div class="details">
        <div class="logo_container">
          <img :src="logoURL || defaultLogo" />
        </div>
        <span>{{ name }}</span>
      </div>
    </div>
    <div class="col">
      <button class="button icon-only copy-url" title="Copy addon manifest URL to clipboard"
        @click="copyManifestURLToClipboard">
        <img src="https://icongr.am/feather/clipboard.svg?size=12" />
      </button>
      <button class="button icon-only edit-manifest" title="Edit manifest JSON" @click="openEditManifestModal">
        <img src="https://icongr.am/feather/edit.svg?size=12" />
      </button>
      <button class="button icon-only delete" title="Remove addon from list" :disabled="!isDeletable"
        @click="removeAddon">
        <img src="https://icongr.am/feather/trash-2.svg?size=12" />
      </button>
    </div>
    <i class="uil uil-draggabledots"></i>
  </div>
</template>

<style scoped>
.sortable-list .item {
  list-style: none;
  display: flex;
  cursor: move;
  align-items: center;
  border-radius: 5px;
  padding: 10px 13px;
  margin-bottom: 11px;
  border: 1px solid #ccc;
  justify-content: space-between;
  flex-wrap: wrap;
}

.dark .sortable-list .item {
  border: 1px solid #434242;
}

.item .details {
  display: flex;
  align-items: center;
  flex: 1;
}

.item .details img {
  height: 60px;
  width: 60px;
  pointer-events: none;
  margin-right: 12px;
  object-fit: contain;
  object-position: center;
  border-radius: 30%;
  background-color: #262626;
}

.col {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  min-width: 200px;
}

.button {
  border-radius: 4px;
  cursor: pointer;
  padding: 5px;
  transition: background-color 0.3s;
}

.icon-only {
  display: flex;
  justify-content: center;
  align-items: center;
}

.visit-url img,
.copy-url img,
.edit-manifest img,
.delete img {
  width: 20px;
  height: 20px;
}

@media (max-width: 768px) {
  .sortable-list .item {
    flex-direction: column;
    align-items: center;
    padding: 10px;
  }

  .item .details {
    margin-bottom: 10px;
    text-align: center;
  }

  .item .details img {
    margin-right: 12px;
    margin-bottom: 8px;
  }

  .col {
    flex-direction: row;
    gap: 8px;
    justify-content: center;
    width: 100%;
    margin-top: 10px;
  }

  .button {
    padding: 6px;
  }

  .uil-draggabledots {
    position: absolute;
    right: 10px;
    bottom: 10px;
  }
}

@media (max-width: 480px) {
  .item .details {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .item .details img {
    margin-bottom: 6px;
  }

  .col {
    flex-direction: row;
    gap: 4px;
    justify-content: center;
    width: 100%;
  }

  .button {
    padding: 4px;
  }

  .uil-draggabledots {
    display: none;
  }
}
</style>
