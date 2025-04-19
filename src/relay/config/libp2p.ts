import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify, identifyPush } from '@libp2p/identify'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { tcp } from '@libp2p/tcp'
import { ping } from '@libp2p/ping'
import { dcutr } from '@libp2p/dcutr'
import { autoNAT } from '@libp2p/autonat'
import { quic } from '@chainsafe/libp2p-quic'
import { autoTLS } from '@ipshipyard/libp2p-auto-tls'
import { keychain } from '@libp2p/keychain'
import { prometheusMetrics } from '@libp2p/prometheus-metrics'
import type { Libp2pOptions } from 'libp2p'
import type { PrivateKey } from '@libp2p/interface'
import { logger } from '@libp2p/logger'

const componentLogger = {
  forComponent: (name: string) => logger(name)
}

export const createLibp2pConfig = (privateKey: PrivateKey): Libp2pOptions => ({
  privateKey,
  metrics: prometheusMetrics(),
  addresses: {
    listen: [
      '/ip4/0.0.0.0/tcp/9091',
      '/ip4/0.0.0.0/udp/9091/quic-v1',
      '/ip4/0.0.0.0/tcp/9092/ws',
      '/ip4/0.0.0.0/udp/9092/webrtc-direct',
      '/ip6/::/tcp/9091',
      '/ip6/::/tcp/9092/ws',
      '/ip6/::/udp/9092/webrtc-direct',
    ]
  },
  transports: [
    circuitRelayTransport(),
    tcp(),
    quic(),
    webRTC(),
    webRTCDirect(),
    webSockets()
  ],
  peerDiscovery: [
    pubsubPeerDiscovery({
      interval: 10000,
      topics: ['le-space._peer-discovery._p2p._pubsub'],
      listenOnly: false
    })
  ],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    ping: ping(),
    autonat: autoNAT(),
    dcutr: dcutr(),
    identify: identify(),
    identifyPush: identifyPush(),
    pubsub: gossipsub({
      allowPublishToZeroTopicPeers: true,
    }),
    ...(!process.env.disableAutoTLS && {
      autoTLS: autoTLS({
        autoConfirmAddress: true,
        ...(process.env.STAGING === 'true' && {
          acmeDirectory: 'https://acme-staging-v02.api.letsencrypt.org/directory'
        })
      })
    }),
    keychain: keychain()
  }
})