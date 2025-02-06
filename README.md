<table border="0" cellspacing="0" cellpadding="0">
  <tr>
      <td>
      <h1>Orbit-Blog</h1>A local-first & peer-to-peer blog powered by OrbitDB which replicates between browsers and mobile apps. Hosted on IPFS (only)</td>
    <td><img src="./public/orbitbloglogo-700.png" width="300" alt="Orbit Blog Logo"></td>
  </tr>
</table>

### Install as Progressive Web App (PWA)

Visit [orbit-blog @ ipns](ipns://k51qzi5uqu5djjnnjgtviql86f19isjyz6azhw48ovgn22m6otstezp2ngfs8g) [IPFS Companion needed](https://docs.ipfs.tech/install/ipfs-companion/)

[![QR Code to PWA](/public/ipns.dweb.link.png)](https://k51qzi5uqu5djjnnjgtviql86f19isjyz6azhw48ovgn22m6otstezp2ngfs8g.ipns.dweb.link/)

### Features
- App related
    - [x] deployable to IPFS
    - [x] run as PWA
        - [x] vite-plugin-pwa
        - [x] orbitlogo ai generated
    - [x] version management
    - [ ] e2e tests
    - [ ] ci / cd
- UI related
    - [ ] show connected peers
    - [x] get local & remote ip/port (IceInfo) to construct WebRTC-SDP and a QR-Code
    - [x] create a scanner to scan WebRTC-SDP-Info to connect without relay to remote peer 
    - [x] deploy to IPFS
    - [x] markdown support for posts 
    - [ ] markdown support for comments
    - [ ] search in posts 
    - [ ] search comments
- OrbitDB related
    - [ ] AcccessController: blog can only write local peer-id
        - [ ] hide delete posts / comments button if not owner  
    - [ ] blog settings centrally via settings db
    - [ ] implement OneTimeAccessController to prevent privkey stealing from malicious browser extensions
        - keep temporary private key / peer-id on laptop 
        - keep secure private key / persistent peer-id on a mobile pwa
        - implement One-Time-Access-Controller with own stream protocol and/ WebRTC-bc-ur-code peering 
        - are browsers supporting MDNS at all? 
    - [ ] DBManager connect & replicated remote blogs
    - [ ] create RaspberryPi pinning - relay
    - [ ] demonstrate webrtc-direct connections without relay-server but SDP-QR-Codes or SDP - Voice
    - [ ] upload & replicate images / integrate ipfs images cids into markdown
