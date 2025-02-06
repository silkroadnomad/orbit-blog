<script lang="ts">
  import { Scanner } from '@doichain/bcur-code-scanner-svelte';
  import { createEventDispatcher } from 'svelte';
  import { multiaddr } from '@multiformats/multiaddr'
  import { heliaStore } from './store';
  import type { ICEInfo } from './types';
  export let show = false;
  export let scanResult: ICEInfo | null = null;
  export let manualInput = '';
  export let showScanner = false;
  
  const dispatch = createEventDispatcher<{
    close: void;
    scan: string;
    manualConnect: string;
  }>();
  
  async function handleScan(result: string) {
    try {
      const iceInfo: ICEInfo = JSON.parse(result);
      scanResult = iceInfo;
      
      const ma = multiaddr(`/ip4/${iceInfo.ip}/udp/${iceInfo.port}/webrtc-direct/certhash/${iceInfo.certhash}/p2p/${iceInfo.peerId}`)
      // const ma = multiaddr(`/ip4/${iceInfo.ip}/udp/${iceInfo.port}/webrtc/p2p/${iceInfo.peerId}`)
      console.log('Connecting to multiaddr:', ma.toString())
      
      try {
        console.log('Starting connection attempt...');
        const connection = await $heliaStore.libp2p.dial(ma);
        console.log('Connection established:', connection);
        
        // Wait a moment to ensure data channel is ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (connection.status === 'open') {
          console.log('Connected successfully:', connection.remotePeer.toString());
        } else {
          console.error('Connection not in open state:', connection.status);
        }
      } catch (err) {
        console.error('Failed to connect:', err);
        if (err.message) console.error('Error message:', err.message);
        if (err.cause) console.error('Error cause:', err.cause);
      }
      
      showScanner = false;
    } catch (err) {
      console.error('Failed to parse QR code data:', err)
    }
  }


  function handleClose() {
    dispatch('close');
  }
  
  function handleScanAnother() {
    scanResult = null;
    dispatch('close');
  }

  async function handleManualInput() {
    try {
      await handleScan(manualInput);
    } catch (err) {
      console.error('Failed to parse manual input:', err);
    }
  }
  
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg max-w-lg w-full mx-4">
      <div class="flex justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Scan or Paste Connection QR</h2>
        <button 
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          on:click={handleClose}
        >
          ✕
        </button>
      </div>
      
      <div class="mb-4">
        <textarea
          class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          placeholder="Paste connection info here..."
          bind:value={manualInput}
          rows="4"
        />
        <button 
          class="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md w-full"
          on:click={handleManualInput}
        >
          Connect from Pasted Info
        </button>
      </div>
      
      <Scanner
        on:result={(e) => dispatch('scan', e.detail)}
      >
        {#if scanResult}
          <div class="text-center text-gray-900 dark:text-white mt-4">
            <p>Scanned IP: {scanResult.ip}</p>
            <p>Port: {scanResult.port}</p>
            <button 
              class="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
              on:click={handleScanAnother}
            >
              Scan Another
            </button>
          </div>
        {/if}
      </Scanner>
    </div>
  </div>
{/if} 