<script lang="ts">
  import { _ } from 'svelte-i18n';
  interface Props {
    isOpen?: boolean;
    onClose?: any;
    children?: import('svelte').Snippet;
    message?: string;
  }

  let { isOpen = false, onClose = () => {}, children, message = '' }: Props = $props();
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg w-full">
      <button class="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onclick={onClose}>
        {$_('close')}
      </button>
      {#if message}
        <p class="text-gray-700 dark:text-gray-300 mb-4">{@html message}</p>
      {/if}
      <slot>{children}</slot>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: 1000;
  }

  .modal {
    position: relative;
    background: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .modal-close {
    position: absolute;
    top: 10px;
    right: 10px;
    border: none;
    background: none;
    font-size: 24px;
    cursor: pointer;
  }
</style> 