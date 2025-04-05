import type { Libp2p } from 'libp2p';
import { writable } from 'svelte/store';
import { info, debug, error } from './utils/logger'

// Store for connected peers count
export const connectedPeersCount = writable<number>(0);

/**
 * Setup event listeners for libp2p peer discovery and connections
 * @param libp2p The libp2p instance to set up listeners for
 */
export function setupPeerEventListeners(libp2p: Libp2p) {
  if (!libp2p) return;
  
  // Update connected peers count initially
  updateConnectedPeersCount(libp2p);
  
  // Set up peer discovery listener
  libp2p.addEventListener('peer:discovery', async (evt) => {
    const peer = evt.detail;
    info(`Peer ${libp2p.peerId.toString()} discovered: ${peer.id.toString()}`);
    debug('peer.multiaddrs', peer);
    
    // Check if we're already connected to this peer
    const connections = libp2p.getConnections(peer.id);
    if (!connections || connections.length === 0) {
      info(`Dialing new peer: ${peer.id.toString()}`);
      
      // Try each multiaddr until one succeeds
      let connected = false;
      for (const addr of peer.multiaddrs) {
        try {
          debug('dialing', addr.toString());
          await libp2p.dial(addr);
          info('Successfully dialed:', addr.toString());
          connected = true;
          break; // Exit the loop once successfully connected
        } catch (error) {
          error(`Failed to dial ${addr.toString()}:`, error);
        }
      }
      
      if (!connected) {
        error(`Failed to connect to peer ${peer.id.toString()} on all addresses`);
      }
    } else {
      info(`Already connected to peer: ${peer.id.toString()}`);
    }
  });

  // Set up peer connection listener
  libp2p.addEventListener('peer:connect', (evt) => {
    debug('peer:connect event', evt.detail.toString());
    info('Connected to %s', evt.detail.toString());
    updateConnectedPeersCount(libp2p);
  });
  
  // Set up peer disconnection listener
  libp2p.addEventListener('peer:disconnect', (evt) => {
    debug('peer:disconnect event', evt.detail.toString());
    info('Disconnected from %s', evt.detail.toString());
    updateConnectedPeersCount(libp2p);
  });
}

/**
 * Update the connected peers count store
 * @param libp2p The libp2p instance to count connections from
 */
function updateConnectedPeersCount(libp2p: Libp2p) {
  if (!libp2p) return;
  
  // Get all unique peer IDs we're connected to
  const peerIds = new Set();
  
  for (const connection of libp2p.getConnections()) {
    peerIds.add(connection.remotePeer.toString());
  }
  
  // Update the store with the count
  connectedPeersCount.set(peerIds.size);
} 