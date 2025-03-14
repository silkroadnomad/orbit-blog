<script lang="ts">

  import { onMount, onDestroy, tick } from 'svelte';
  import { createOrbitDB, IPFSAccessController } from '@orbitdb/core';
  import { createLibp2p } from 'libp2p'
  import { multiaddr } from '@multiformats/multiaddr'
  import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
  import { privateKeyFromProtobuf } from '@libp2p/crypto/keys';

  import { createHelia } from 'helia'
  import { LevelDatastore } from 'datastore-level'
  import { LevelBlockstore } from 'blockstore-level'
  import PostForm from './lib/PostForm.svelte';
  import PostList from './lib/PostList.svelte';
  import ThemeToggle from './lib/ThemeToggle.svelte';
  import DBManager from './lib/DBManager.svelte';
  import ConnectedPeers from './lib/ConnectedPeers.svelte';
  import Settings from './lib/Settings.svelte';
  import PasswordModal from './lib/PasswordModal.svelte';
  import { Libp2pOptions, multiaddrs } from './lib/config'
  import { generateMnemonic } from 'bip39';
  import { Identities } from '@orbitdb/core'
  import { postsDB, postsDBAddress, posts, remoteDBs, remoteDBsDatabases, showDBManager, showPeers, showSettings, blogName, libp2p, helia, orbitdb, identity, identities, settingsDB, blogDescription, categories, seedPhrase } from './lib/store';
  import Sidebar from './lib/Sidebar.svelte';
  import { encryptSeedPhrase, decryptSeedPhrase, isEncryptedSeedPhrase } from './lib/cryptoUtils';
  import { Voyager } from '@orbitdb/voyager'
  import { generateMasterSeed, generateAndSerializeKey } from './lib/utils';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { FaBars, FaTimes } from 'svelte-icons/fa';

  let blockstore = new LevelBlockstore('./helia-blocks');
  let datastore = new LevelDatastore('./helia-data');

  let encryptedSeedPhrase = localStorage.getItem('encryptedSeedPhrase');

  let showPasswordModal = encryptedSeedPhrase ? true : false;
  let isNewUser = !encryptedSeedPhrase;
  let canWrite = false;
  let voyager: Voyager | null = null;

  // Add sidebar state variables
  let sidebarVisible = true;
  let touchStartX = 0;
  let touchEndX = 0;
  const SWIPE_THRESHOLD = 50;
  let sidebarTimer = null;

  if(!encryptedSeedPhrase) {
      console.log('no seed phrase, generating new one')
      $seedPhrase = generateMnemonic();
      initializeApp();
  }

  // Function to toggle sidebar visibility
  function toggleSidebar() {
    sidebarVisible = !sidebarVisible;
  }

  function startSidebarTimer() {
    if (sidebarTimer) clearTimeout(sidebarTimer);
    
    sidebarTimer = setTimeout(async () => {
      await tick();
      sidebarVisible = false;
    }, 15000);
  }

  // Watch for password modal changes
  $: if (!showPasswordModal && sidebarVisible) {
    // This runs when password is successfully entered or no password is needed
    console.log('Password modal closed, sidebar visible - starting timer');
    startSidebarTimer();
  }

  async function handleSeedPhraseCreated(event: CustomEvent) {
    const newSeedPhrase = generateMnemonic();
    const encryptedPhrase = await encryptSeedPhrase(newSeedPhrase, event.detail.password);
    localStorage.setItem('encryptedSeedPhrase', encryptedPhrase);
    $seedPhrase = newSeedPhrase;
    showPasswordModal = false; // This will trigger the reactive statement above
    initializeApp();
  }

  async function handleSeedPhraseDecrypted(event: CustomEvent) {
    $seedPhrase = event.detail.seedPhrase;
    showPasswordModal = false; // This will trigger the reactive statement above
    initializeApp();
  }

  async function initializeApp() {
    if (!seedPhrase) return;
    
    console.log('initializeApp',)
    const masterSeed = generateMasterSeed($seedPhrase, "password");
    const { hex } = await generateAndSerializeKey(masterSeed.subarray(0, 32))
    const privKeyBuffer = uint8ArrayFromString(hex, 'hex');
    const _keyPair = await privateKeyFromProtobuf(privKeyBuffer);
    $libp2p = await createLibp2p({ privateKey: _keyPair, ...Libp2pOptions })
    console.log('libp2p', $libp2p)
    $helia = await createHelia({ libp2p: $libp2p, datastore, blockstore })
    console.log('helia', $helia)
    // const ret = await getIdentity($helia, $seedPhrase) //DID idntity
      // = ret.identity
    // $identities = ret.identities
    $identities = await Identities({ ipfs: $helia })
    $identity = await $identities.createIdentity({ id: 'me' })
  
    
    $orbitdb = await createOrbitDB({
      ipfs: $helia,
      //identity: ret.identity,
      identity: $identity,
      storage: blockstore,
      directory: './orbitdb',
    })

    const addr = multiaddr(multiaddrs[0])
    voyager = await Voyager({ orbitdb: $orbitdb, address: addr})
    console.log('voyager', voyager)
    $libp2p?.addEventListener('peer:discovery', async (evt) => {
      const peer = evt.detail
      // console.log('peer', peer)
      console.log(`Peer ${$libp2p?.peerId.toString()} discovered: ${peer.id.toString()}`)
      console.log('peer.multiaddrs', peer)
      // Check if we're already connected to this peer
      const connections = $libp2p?.getConnections(peer.id)
      if (!connections || connections.length === 0) {
        console.log(`Dialing new peer: ${peer.id.toString()}`)
        
        // Try each multiaddr until one succeeds
        let connected = false
        for (const addr of peer.multiaddrs) {
          try {
              console.log('dialing', addr.toString())
              await $libp2p?.dial(addr)
              console.log('Successfully dialed:', addr.toString())
              connected = true
            break // Exit the loop once successfully connected
          } catch (error) {
            console.warn(`Failed to dial ${addr.toString()}:`, error.message)
          }
        }
        
        if (!connected) {
          console.error(`Failed to connect to peer ${peer.id.toString()} on all addresses`)
        }
      } else {
        console.log(`Already connected to peer: ${peer.id.toString()}`)
      }
    })

    $libp2p?.addEventListener('peer:connect', (evt) => {
      console.log('evt', evt.detail.toString())
      console.log('Connected to %s', evt.detail.toString()) // Log connected peer
    })

  }

  /**
   * Check if the user has write access to the posts database
  */
  $:if ($orbitdb && $postsDB && $identity) {
      const access = $postsDB.access;
      canWrite = access.write.includes($identity.id) && $postsDB.address === $postsDBAddress
  }

  onDestroy(async () => {
    try {
      await $settingsDB?.close();
      await $postsDB?.close();
    } catch (error) {
      console.error('Error closing OrbitDB connections:', error);
    }
    if (sidebarTimer) clearTimeout(sidebarTimer);
  })

  $:if($orbitdb && voyager){
    console.log('connecting to voyager')
    voyager?.orbitdb.open('settings', {
          type: 'documents',
          create: true,
          overwrite: false,
          directory: './orbitdb/settings',
          identity: $identity,
          identities: $identities,
          AccessController: IPFSAccessController({write: [$identity.id]}),
        }).then(_db => {
          $settingsDB = _db;
          window.settingsDB = _db;
          voyager?.add(_db.address).then((ret) => console.log('voyager added settingsDB', ret))
        }).catch( err => console.log('error', err))
        
        voyager?.orbitdb.open('posts', {
          type: 'documents',
          create: true,
          overwrite: false,
          directory: './orbitdb/posts',
          identity: $identity,
          identities: $identities,
          AccessController: IPFSAccessController({write: [$identity.id]}),
        }).then(_db => {
          $postsDB = _db;
          window.postsDB = _db;
          voyager?.add(_db.address).then((ret) => console.log('voyager added postsDB', ret))
          console.log('postsDB', _db.address.toString())
// $settingsDB.put('postsDBAddress', _db.address.toString())
          $postsDBAddress = _db.address.toString()
        }).catch( err => console.log('error', err))

        voyager?.orbitdb.open('remote-dbs', {
          type: 'documents',
          create: true,
          overwrite: false,
          identities: $identities,
          identity: $identity,
          AccessController: IPFSAccessController({write: [$identity.id]}),
        }).then(_db => {
          $remoteDBsDatabases = _db;
          window.remoteDBsDatabases = _db;
          voyager?.add(_db.address).then((ret) => console.log('voyager added remoteDBsDatabases', ret))
        }).catch(err => console.error('Error opening remote DBs database:', err));
  }

  $:if($settingsDB && (!$blogName || !$blogDescription || !$categories || !$postsDBAddress)) {
    console.log('settingsDB', $settingsDB)
    $settingsDB.get('blogName').then(result => 
      result?.value?.value !== undefined ? ($blogName = result.value.value) : null
    );
    
    $settingsDB.get('blogDescription').then(result => 
      result?.value?.value !== undefined ? ($blogDescription = result.value.value) : null
    );
    
    $settingsDB.get('categories').then(result => 
      result?.value?.value !== undefined ? ($categories = result.value.value) : null
    );
    $settingsDB.get('postsDBAddress').then(result => {
        if(result?.value?.value !== undefined){
          console.log("postsDBAddress is defined", result.value.value)
          $postsDBAddress = result.value.value
        } else {
          const postsDBAddress = $postsDB?.address.toString()
          console.log("postsDBAddress is not defined - but storing it now!", postsDBAddress)
          $settingsDB?.put({ _id: 'postsDBAddress', value: postsDBAddress});
          $settingsDB?.all().then(result => console.log('settingsDB.all()', result))
        }
      }
    )
    
  $settingsDB.events.on('update', 
    async (entry) => {
      console.log('settingsDB.update', entry)
      if (entry?.payload?.op === 'PUT') {
        const { _id, ...rest } = entry.payload.value;
        console.log('settingsDB.update', entry.payload.key, rest)
        if(entry.payload.key==='blogName') $blogName = rest.value;
        if(entry.payload.key==='blogDescription') $blogDescription = rest.value;
        if(entry.payload.key==='categories') $categories = rest.value;
       } else if (entry?.payload?.op === 'DEL') { }
    });
  }

  $:if($postsDB){
    $postsDB.all().then(posts => $posts = posts.map(entry => entry.value)).catch(err => console.error('Error opening posts database:', err));
    $postsDB.events.on('update', async (entry) => {
      console.log('Database update:', entry);
      if (entry?.payload?.op === 'PUT') {
        const { _id, ...rest } = entry.payload.value;
        posts.update(current => [...current, { ...rest, _id: _id }]);
      } else if (entry?.payload?.op === 'DEL') {
        posts.update(current => current.filter(post => post._id !== entry.payload.key));
      }
    });
  }

  $:if($remoteDBsDatabases){
    console.info('Remote DBs database opened successfully:', $remoteDBsDatabases);
    $remoteDBsDatabases.all().then(savedDBs => {
      const _remoteDBs = savedDBs.map(entry => entry.value);
      console.info('Remote DBs list:', _remoteDBs);
      $remoteDBs = _remoteDBs;
    })
  }

  // Handle touch events for sidebar gestures
  function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
  }

  function handleTouchMove(e) {
    touchEndX = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (touchStartX - touchEndX > SWIPE_THRESHOLD && sidebarVisible) {
      // Swipe left - hide sidebar
      sidebarVisible = false;
    } else if (touchEndX - touchStartX > SWIPE_THRESHOLD && !sidebarVisible) {
      // Swipe right - show sidebar
      sidebarVisible = true;
    }
  }

  // Add mouse-related functions
  function handleMouseEnter() {
    if (!sidebarVisible) {
      sidebarVisible = true;
      // Start the auto-hide timer when sidebar is shown via mouse hover
      startSidebarTimer();
    }
  }

</script>
<svelte:head>
  <title>{$blogName} {__APP_VERSION__}</title>
</svelte:head>
{#if showPasswordModal}
  <PasswordModal 
    {isNewUser} 
    encryptedSeedPhrase={encryptedSeedPhrase}
    on:seedPhraseCreated={handleSeedPhraseCreated}
    on:seedPhraseDecrypted={handleSeedPhraseDecrypted}
  />
{:else}
  <main class="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors"
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}>
    
    <!-- Sidebar Component with animation -->
    {#if sidebarVisible}
      <div in:fly={{ x: -300, duration: 400, easing: cubicOut }} 
           out:fly={{ x: -300, duration: 400, easing: cubicOut }}
           class="relative">
        <!-- Add the toggle button inside the sidebar instead of fixed -->
        <button 
          class="absolute top-2 right-1 z-50 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full p-1 shadow-sm transition-all duration-300 focus:outline-none"
          on:click={toggleSidebar}
          aria-label="Hide sidebar">
          <div class="w-4 h-4 text-gray-800 dark:text-gray-200">
            <FaTimes />
          </div>
        </button>
        <Sidebar />
      </div>
    {:else}
      <!-- Fixed toggle button when sidebar is hidden -->
      <button 
        class="fixed top-4 left-4 z-50 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full p-1 shadow-sm transition-all duration-300 focus:outline-none"
        on:click={toggleSidebar}
        aria-label="Show sidebar">
        <div class="w-4 h-4 text-gray-800 dark:text-gray-200">
          <FaBars />
        </div>
      </button>
      
      <!-- Sidebar trigger area for edge detection -->
      <div 
        class="w-8 h-full fixed top-0 left-0 z-10 cursor-pointer" 
        on:click={toggleSidebar}
        on:mouseenter={handleMouseEnter}
        aria-label="Show sidebar">
      </div>
    {/if}
    
    <!-- Main Content -->
    <div class="flex-1 overflow-x-hidden">
      <div class="max-w-7xl mx-auto py-8 px-4">
        <h1 class="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">{$blogName}</h1> 
        <h6 class="text-sm text-center mb-8 text-gray-900 dark:text-white">{$blogDescription}</h6>
        <h6>{__APP_VERSION__}</h6>

        {#if $showDBManager}
          <DBManager />
        {/if}
        
        {#if $showPeers}
          <ConnectedPeers />
        {/if}

        {#if $showSettings}
          <Settings {seedPhrase} />
        {/if}
        
        <div class="grid gap-8">
          <PostList />
          {#if canWrite}
            <PostForm />
          {/if}

        </div>
      </div>
    </div>
  </main>

  <ThemeToggle />
{/if}

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  button {
    /* background-color: inherit;  ensure buttons inherit the background color */
    color: inherit; /* ensure buttons inherit the text color */
    border: none; /* remove default button border */
    cursor: pointer; /* change cursor to pointer on hover */
  }

  button:hover {
    opacity: 0.9; /* Slightly reduce opacity on hover for visual feedback */
  }

  /* Ensure dark mode styles are applied correctly */
  .dark button {
    background-color: inherit;
    color: inherit;
  }

  /* Add styles for sidebar interaction */
  .w-4 {
    width: 1rem;
  }
  
  .h-full {
    height: 100%;
  }
  
  .fixed {
    position: fixed;
  }
  
  .top-0 {
    top: 0;
  }
  
  .left-0 {
    left: 0;
  }
  
  .z-10 {
    z-index: 10;
  }
  
  .cursor-pointer {
    cursor: pointer;
  }

  /* Make sure the sidebar takes appropriate space */
  :global(.sidebar) {
    padding-top: 3.5rem; /* Add space at the top of the sidebar for the toggle button */
  }
</style>