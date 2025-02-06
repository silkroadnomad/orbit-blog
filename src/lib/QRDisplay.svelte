<script lang="ts">
  export let qrCode: string;
  export let connectionInfo: Array<{
    ip: string;
    port: number;
    relatedIP?: string;
    relatedPort?: number;
    peerId: string;
  }>;
  $: console.log('connectionInfo:', connectionInfo);
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
</script>

<div class="mb-4 p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
  <img src={qrCode} alt="Connection QR Code" class="mx-auto mb-4" />
  <div class="text-center text-gray-900 dark:text-white">
    <!-- {#if connectionInfo && connectionInfo.length > 0} -->
      <!-- {#each connectionInfo as info} -->
        <div class="mb-4 p-2 border-b border-gray-200 dark:border-gray-700">
          <p>Public IP: {connectionInfo.ip}</p>
          <p>Port: {connectionInfo.port}</p>
          {#if connectionInfo.relatedIP}
            <p>Related IP: {connectionInfo.relatedIP}</p>
          {/if}
          {#if connectionInfo.relatedPort}
            <p>Related Port: {connectionInfo.relatedPort}</p>
          {/if}
          <p>PeerId: {connectionInfo.peerId}</p>
        </div>
      <!-- {/each} -->
    <!-- {:else} -->
      <p class="text-gray-600 dark:text-gray-400">No connection information available</p>
    <!-- {/if} -->
    <button 
      class="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
      on:click={() => copyToClipboard(JSON.stringify(connectionInfo))}
    >
      Copy Connection Info
    </button>
  </div>
</div> 