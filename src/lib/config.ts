import { webSockets } from "@libp2p/websockets";
import * as filters from "@libp2p/websockets/filters";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { webTransport } from "@libp2p/webtransport";
import { noise } from "@chainsafe/libp2p-noise";
import { bootstrap } from '@libp2p/bootstrap'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify, identifyPush } from "@libp2p/identify"
import { autoNAT } from "@libp2p/autonat"
import { dcutr } from '@libp2p/dcutr'
import { gossipsub } from "@chainsafe/libp2p-gossipsub"
import { ping } from '@libp2p/ping'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { BROWSER, DEV } from 'esm-env'
/*import { FaultTolerance } from '@libp2p/interface-transport'*/

let VITE_SEED_NODES = import.meta.env.VITE_SEED_NODES.replace('\n','').split(',')
let VITE_SEED_NODES_DEV = import.meta.env.VITE_SEED_NODES_DEV.replace('\n','').split(',')
let MODE = import.meta.env.MODE
let VITE_P2P_PUPSUB_DEV = import.meta.env.VITE_P2P_PUPSUB_DEV || '';
let VITE_P2P_PUPSUB = import.meta.env.VITE_P2P_PUPSUB || '';

let _VITE_SEED_NODES_DEV = process.env.VITE_SEED_NODES_DEV || '';
let _VITE_SEED_NODES = process.env.VITE_SEED_NODES || '';
let _MODE = process.env.MODE
let _VITE_P2P_PUPSUB_DEV = process.env.VITE_P2P_PUPSUB_DEV || '';
let _VITE_P2P_PUPSUB = process.env.VITE_P2P_PUPSUB || '';

if(_VITE_SEED_NODES || _VITE_SEED_NODES_DEV || _MODE) {
    VITE_SEED_NODES = _VITE_SEED_NODES
    VITE_SEED_NODES_DEV = _VITE_SEED_NODES_DEV
    MODE = _MODE
    VITE_P2P_PUPSUB = _VITE_P2P_PUPSUB
    VITE_P2P_PUPSUB_DEV = _VITE_P2P_PUPSUB_DEV
}

export let multiaddrs = MODE === 'development'?VITE_SEED_NODES_DEV:VITE_SEED_NODES
let pubSubPeerDiscoveryTopics = MODE === 'development'?VITE_P2P_PUPSUB_DEV:VITE_P2P_PUPSUB_DEV
        
export const bootstrapConfig = {list: multiaddrs};
import type { Libp2pOptions } from '@libp2p/interface'

export const libp2pOptions: Libp2pOptions = {
    addresses: {
        listen: [
            '/p2p-circuit',
            "/webrtc",
            "/webtransport",
            "/wss", "/ws",
        ]
    },
    transports: [
        webTransport(),
        webSockets({filter: filters.all}),
        webRTC({
             rtcConfiguration: {
                 iceServers:[{
                     urls: [
                         'stun:stun.l.google.com:19302',
                         'stun:global.stun.twilio.com:3478'
                     ]
                 }]
             }
         }),
        webRTCDirect(),
        circuitRelayTransport({ discoverRelays: 1 } as any) // TODO: Update with correct type after checking latest @libp2p/circuit-relay-v2 types
        // kadDHT({}),
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [
        yamux(),
    ],
    connectionGater: {
        denyDialMultiaddr: () => {
            return false
        }
    },
    peerDiscovery: [
        bootstrap(bootstrapConfig),
        pubsubPeerDiscovery({
            interval: 10000,
            topics: pubSubPeerDiscoveryTopics, // defaults to ['_peer-discovery._p2p._pubsub']
            listenOnly: false,
        })
    ],
    services: {
        identify: identify(),
        identifyPush: identifyPush(),
        ping: ping(),
        autoNAT: autoNAT(),
        dcutr: dcutr(),
        pubsub: gossipsub({ allowPublishToZeroTopicPeers: true, canRelayMessage: true })
    },
    connectionManager: {
        autoDial: true,
        minConnections: 3,
    },
}
