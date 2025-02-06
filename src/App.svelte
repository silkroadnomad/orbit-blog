<script lang="ts">
	import { Libp2pOptions } from './lib/config.ts';
  import { onMount, onDestroy } from 'svelte';
  import PostForm from './lib/PostForm.svelte';
  import PostList from './lib/PostList.svelte';
  import ThemeToggle from './lib/ThemeToggle.svelte';
  import DBManager from './lib/DBManager.svelte';
  import { heliaStore, orbitStore, postsDB, posts, remoteDBsDatabase, remoteDBs } from './lib/store';
  import { IPFSAccessController } from '@orbitdb/core';
  import { getPublicIP, createOffer, handleAnswer } from './lib/webrtc-direct';
  import QRCode from 'qrcode';
  import QRDisplay from './lib/QRDisplay.svelte';
  import QRScanner from './lib/QRScanner.svelte';
  import ConnectedPeers from './lib/ConnectedPeers.svelte';
  import { sha256 } from 'multiformats/hashes/sha2'
  import { base64url } from 'multiformats/bases/base64'
  let showDBManager = false;
  let publicIPQR = '';
  let publicIPInfo: { ip: string; port: number; peerId: string; multiaddrs: string[] } | null = null;
  let showScanner = false;
  let scanResult: ICEInfo | null = null;
  let manualInput = '';
  let showPeers = false;

  async function dropAndSync() {
    try {
      // Drop the local database
      await $postsDB.drop();
      console.info('Local database dropped successfully');
      
      console.info('resyncing from network');
    } catch (error) {
      console.error('Error during drop and sync:', error);
    }
  }
  let pcA: RTCPeerConnection;
  async function createSDP() {

    const cert = await RTCPeerConnection.generateCertificate({
        name: 'ECDSA',
        namedCurve: 'P-256'
    });
    // Get fingerprint and convert to bytes
    const fingerprintHex = cert.getFingerprints()[0].value.replace(/:/g, '').toLowerCase();
     
    // Get fingerprint and convert to bytes
    const fingerprintBytes = new Uint8Array(fingerprintHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    // Hash the fingerprint bytes with SHA-256
    const hashed = await sha256.digest(fingerprintBytes);
    
    // Encode to base64url (this is what libp2p uses for certhashes)
    const certString = base64url.encode(hashed.bytes);
    console.log('Generated certhash:', certString);

     pcA = new RTCPeerConnection({
        certificates: [cert],
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },  // Google (Global)
            { urls: 'stun:stun.stunprotocol.org:3478' },  // stunprotocol.org (Global)
            { urls: 'stun:stun.voip.blackberry.com:3478' },  // Blackberry (Canada)
            { urls: 'stun:stun.freecall.com:3478' },  // Freecall (Germany)
            { urls: 'stun:stun.sip.us:3478' },  // US
            { urls: 'stun:stun.zadarma.com:3478' },  // Russia
            { urls: 'stun:stun.schlund.de:3478' },  // Germany
            { urls: 'stun:stun.sipgate.net:10000' },  // Germany
            { urls: 'stun:stun.ekiga.net:3478' }  // France
        ]   
    });

    pcA.onicegatheringstatechange = () => {
        console.log('ICE gathering state:', pcA.iceGatheringState);
    };

 console.log('pcA:', pcA);
  // Create offer
  const {candidates, dataChannel} = await createOffer(pcA);
  candidates[0].certhash = certString;
  dataChannel.onmessage = (e) => console.log('Received message:', e.data);
  dataChannel.onclose = () => console.log('Data channel closed');
  dataChannel.onerror = (err) => console.error('Data channel error:', err);
    
  console.log('create Offer ICE Info:', candidates[0]);

  const qrData = JSON.stringify(candidates[0]);
  publicIPQR = await QRCode.toDataURL(qrData);
  if (candidates[0] && $heliaStore?.libp2p) {
        const connectionInfo = {
          ...candidates[0],
          peerId: $heliaStore.libp2p.peerId.toString(),
          // multiaddrs: multiaddrs.map(addr => addr.toString()) // Convert multiaddrs to strings
        };
        publicIPInfo = connectionInfo;
    }
  console.log('publicIPQR:', publicIPQR);
  // Copy this offerSdp and paste it in Browser B

  // After getting the answer from Browser B:
  // await handleAnswer(pcA, answerSdp); // paste the answer SDP here
  }

  async function generatePublicIPQR() {
    if (publicIPQR) {
      // If QR is showing, hide it
      publicIPQR = '';
      publicIPInfo = null;
    } else {
      // If QR is hidden, generate and show it
      console.log('heliaStore:', $heliaStore);
      
      // Get all active connections
      const connections = $heliaStore.libp2p.getConnections();
      console.log('Active connections:', connections.map(conn => ({
        remotePeer: conn.remotePeer.toString(),
        direction: conn.direction,
        status: conn.status,
        multiplexer: conn.multiplexer,
        encryption: conn.encryption,
        timeline: conn.timeline
      })));

      for(const connection of connections) {
        console.log('connection:', connection);yy
          const rtcPeerConnection = (connection as any).peerConnection as RTCPeerConnection
          console.log(rtcPeerConnection)
      }
      
      const publicIP = await getPublicIP($heliaStore);
      // Get multiaddrs from the libp2p node
      const multiaddrs = $heliaStore.libp2p.getMultiaddrs();
      console.log('multiaddrs:', multiaddrs.map(addr => addr.toString()));
     
      if (publicIP && $heliaStore?.libp2p) {
        const connectionInfo = {
          ...publicIP,
          peerId: $heliaStore.libp2p.peerId.toString(),
          // multiaddrs: multiaddrs.map(addr => addr.toString()) // Convert multiaddrs to strings
        };
        publicIPInfo = connectionInfo;
        const qrData = JSON.stringify(connectionInfo);
        publicIPQR = await QRCode.toDataURL(qrData);
      } else {
        console.error('Could not get public IP or libp2p node not initialized');
      }
    }
  }

  onMount(async () => {
    console.log('Initializing OrbitDB...');

    try {
        $postsDB = await $orbitStore.open('posts', {
          type: 'documents',
          create: true,
          overwrite: false,
          directory: './orbitdb/posts',
          AccessController: IPFSAccessController({
            write: ["*"]
          }),
      });

      $remoteDBsDatabase = await $orbitStore.open('remote-dbs', {
        type: 'documents',
        create: true,
        overwrite: false,
        directory: './orbitdb/remote-dbs',
        AccessController: IPFSAccessController({
          write: ["*"]
        }),
      });

      $remoteDBsDatabase.events.on('update', async (entry) => {
        console.log('Remote DBs update:', entry);
        const savedDBs = await $remoteDBsDatabase.all();
        $remoteDBs = savedDBs.map(entry => entry.value);
      });

      const savedDBs = await $remoteDBsDatabase.all();
      $remoteDBs = savedDBs.map(entry => entry.value);
      console.info('Remote DBs list:', $remoteDBs);

      console.info('OrbitDB initialized successfully', $orbitStore);
      console.info('Postsdb initialized successfully', $postsDB);
      let currentPosts = await $postsDB.all();
      console.log('Current posts:', currentPosts);

      if (currentPosts.length === 0) {
        console.info('No existing posts found, initializing with sample data');
        for (const post of $posts) {
          console.log('Adding post:', post);
          const postWithId = {
            ...post,
            _id: post._id // Add _id field while keeping the original id
          };
          console.log('Adding post with _id:', postWithId);
          await $postsDB.put(postWithId);
        }
      } else {
        console.info('Loading existing posts from OrbitDB');
        $posts = currentPosts.map(entry => {
          const { _id, ...rest } = entry.value;
          return { ...rest, _id: _id }; // Convert _id back to id
        });
      }
      
      $postsDB?.events.on('join', async (peerId, heads) => {
        // The peerId of the ipfs1 node.
        console.log("peerId", peerId)
      })

      $postsDB?.events.on('update', async (entry) => {
        console.log('Database update:', entry);
        if (entry?.payload?.op === 'PUT') {
          const { _id, ...rest } = entry.payload.value;
          $posts = [...$posts, { ...rest, _id: _id }];
        } else if (entry?.payload?.op === 'DEL') {
          $posts = $posts.filter(post => post._id !== entry.payload.key);
        }
      });
    } catch (error) {
      console.error('Error initializing OrbitDB:', error);
    }
  });

  onDestroy(async () => {
    console.log('Closing OrbitDB connections...');
    try {
      await $postsDB?.close();
      await $orbitStore?.close();
      await $heliaStore?.close();
      console.info('OrbitDB connections closed successfully');
    } catch (error) {
      console.error('Error closing OrbitDB connections:', error);
    }
  });
</script>
<svelte:head>
	<title>Orbit Blog {__APP_VERSION__}</title>
</svelte:head>

<main class="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
  <div class="max-w-7xl mx-auto py-8 px-4">
    <h1 class="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">Orbit Blog</h1>
    
    <div class="flex gap-4 mb-4">
      <button 
        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
        on:click={() => showDBManager = !showDBManager}
      >
        {showDBManager ? 'Hide' : 'Show'} Database Manager
      </button>
      
      <button 
        class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
        on:click={createSDP}
      >
        {publicIPQR ? 'Hide' : 'Show'} Connection QR
      </button>
      
      <button 
        class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors"
        on:click={() => showScanner = !showScanner}
      >
        {showScanner ? 'Hide' : 'Show'} QR Scanner
      </button>
      
      <button 
        class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors"
        on:click={() => showPeers = !showPeers}
      >
        {showPeers ? 'Hide' : 'Show'} Connected Peers
      </button>

        <!-- New Sync Button -->
    <button
      on:click={dropAndSync}
      class="bg-purple-600 dark:bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors flex items-center gap-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
      </svg>
      Drop Posts & Sync from Network
    </button>
    </div>
    
    {#if publicIPQR}
      <QRDisplay 
        qrCode={publicIPQR}
        connectionInfo={publicIPInfo}
      />
    {/if}
    
    <QRScanner
      bind:show={showScanner}
      {scanResult}
      {manualInput}
      on:close={() => showScanner = false}
      on:scan={async (e) => await handleScan(e.detail)}
      on:manualConnect={async (e) => await handleScan(e.detail)}
    />
    
    {#if showDBManager}
      <DBManager />
    {/if}
    
    {#if showPeers}
      <ConnectedPeers />
    {/if}
    
    <div class="grid gap-8">
      <PostList />
      <PostForm />
    </div>
  </div>
</main>

<ThemeToggle />

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
</style>