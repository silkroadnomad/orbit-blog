<script lang="ts">
  import { heliaStore, orbitStore, postsDB, bootstrapEnabled } from './store';
  import { onMount, onDestroy } from 'svelte';
  import type { Connection } from '@libp2p/interface-connection'
  import { createHelia } from 'helia'
  import { getLibp2pOptions } from './config';
  
  interface PeerInfo {
    id: string;
    connected: boolean;
    transport: string;
    streams: number;
    direction: string;
    multiaddr: string;
  }
  
  let peers: PeerInfo[] = [];
  
  function getTransportFromMultiaddr(conn: Connection): string {
    const remoteAddr = conn.remoteAddr.toString();
    
    // Check for different transport protocols
    if (remoteAddr.includes('/webrtc-direct')) return 'WebRTC Direct';
    if (remoteAddr.includes('/webrtc')) return 'WebRTC';
    if (remoteAddr.includes('/wss')) return 'WSS';
    if (remoteAddr.includes('/ws')) return 'WS';
    if (remoteAddr.includes('/webtransport')) return 'WebTransport';
    if (remoteAddr.includes('/tcp')) return 'TCP';
    
    return 'Unknown';
  }
  
  function updatePeersList() {
    if ($heliaStore?.libp2p) {
      const connections = $heliaStore.libp2p.getConnections();
      peers = connections.map(conn => ({
        id: conn.remotePeer.toString(),
        connected: conn.status === 'open',
        transport: getTransportFromMultiaddr(conn),
        streams: conn.streams.length,
        direction: conn.direction,
        multiaddr: conn.remoteAddr.toString()
      }));
      console.log('Updated peers list:', peers);
    }
  }
  
  async function toggleBootstrap() {
    try {
      // Close existing connections
      await $postsDB?.close();
      // Create new Helia instance with updated config
      const newHelia = await createHelia(getLibp2pOptions($bootstrapEnabled));
      heliaStore.set(newHelia);
      
      console.log(`Bootstrap nodes ${$bootstrapEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling bootstrap nodes:', error);
    }
  }
  
  onMount(() => {
    if ($heliaStore?.libp2p) {
      // Initial peers list
      updatePeersList();
      
      // Listen for peer connection events
      $heliaStore.libp2p.addEventListener('peer:connect', (event) => {
        console.log('Peer connected:', event.detail);
        updatePeersList();
      });
      
      $heliaStore.libp2p.addEventListener('peer:disconnect', (event) => {
        console.log('Peer disconnected:', event.detail);
        updatePeersList();
      });

    }
  });
  
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-xl font-bold text-gray-900 dark:text-white">Connected Peers</h2>
    
    <!-- Add toggle switch -->
    <label class="flex items-center cursor-pointer">
      <span class="mr-3 text-sm text-gray-900 dark:text-white">
        Bootstrap Nodes
      </span>
      <div class="relative">
        <input 
          type="checkbox" 
          class="sr-only" 
          bind:checked={$bootstrapEnabled}
          on:change={toggleBootstrap}
        >
        <div class="block bg-gray-600 w-14 h-8 rounded-full"></div>
        <div class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform
          {$bootstrapEnabled ? 'translate-x-6 bg-green-400' : 'bg-white'}">
        </div>
      </div>
    </label>
  </div>
  
  {#if peers.length === 0}
    <p class="text-gray-600 dark:text-gray-400 text-center">No peers connected</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b dark:border-gray-700">
            <th class="px-4 py-2 text-left text-gray-900 dark:text-white">Peer ID</th>
            <th class="px-4 py-2 text-left text-gray-900 dark:text-white">Status</th>
            <th class="px-4 py-2 text-left text-gray-900 dark:text-white">Transport</th>
            <th class="px-4 py-2 text-left text-gray-900 dark:text-white">Streams</th>
            <th class="px-4 py-2 text-left text-gray-900 dark:text-white">Direction</th>
          </tr>
        </thead>
        <tbody>
          {#each peers as peer (peer.id + peer.multiaddr)}
            <tr class="border-b dark:border-gray-700">
              <td 
                class="px-4 py-2 text-gray-900 dark:text-white font-mono text-sm relative group cursor-help"
                title={peer.multiaddr}
              >
                <span>{peer.id}</span>
                <!-- Tooltip -->
                <div class="invisible group-hover:visible absolute left-0 top-full mt-2 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50 whitespace-nowrap">
                  {peer.multiaddr}
                </div>
              </td>
              <td class="px-4 py-2">
                <span class={`inline-block px-2 py-1 rounded-full text-xs ${peer.connected ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                  {peer.connected ? 'Connected' : 'Disconnected'}
                </span>
              </td>
              <td class="px-4 py-2 text-gray-900 dark:text-white">
                <span class="inline-block px-2 py-1 rounded-full text-xs bg-blue-500 text-white">
                  {peer.transport}
                </span>
              </td>
              <td class="px-4 py-2 text-gray-900 dark:text-white">{peer.streams}</td>
              <td class="px-4 py-2 text-gray-900 dark:text-white">{peer.direction}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  /* Ensure tooltips don't get cut off */
  .relative {
    overflow: visible;
  }
  
  /* Add toggle switch styles */
  .dot {
    transition: transform 0.3s ease-in-out;
  }
  
  input:checked ~ .dot {
    transform: translateX(100%);
  }
</style> 