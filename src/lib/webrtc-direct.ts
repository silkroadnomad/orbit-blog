import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import { base64url } from 'multiformats/bases/base64'
import { sha256 } from 'multiformats/hashes/sha2'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { base32 } from 'multiformats/bases/base32'

interface ICEInfo {
    ip: string;
    port: number;
    protocol: string;
    type: string;
    priority: number;
    foundation: string;
    component: string;
    relatedIP?: string;    // raddr
    relatedPort?: number;  // rport
    ufrag: string;
    certhash: string;
    peerId: string;
}

export async function getPublicIP(_heliaStore: HeliaStore) {
    console.log('Getting public IP...');
    console.log('libp2p:', _heliaStore.libp2p);
    
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

    const pc = new RTCPeerConnection({
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

    pc.onicegatheringstatechange = () => {
        console.log('ICE gathering state:', pc.iceGatheringState);
    };

    // Create data channel before creating offer
    const dataChannel = pc.createDataChannel('libp2p-webrtc-direct');
    dataChannel.onopen = () => console.log('Data channel opened');
    dataChannel.onclose = () => console.log('Data channel closed');
    dataChannel.onerror = (err) => console.error('Data channel error:', err);

    // Create and set local description
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return new Promise<ICEInfo[] | null>((resolve) => {
        setTimeout(() => {
            resolve(null)  // Timeout after 5 seconds
        }, 5000)
        
        const candidates: ICEInfo[] = [];
        
        pc.onicecandidate = async (ice) => {
            if (ice.candidate && ice.candidate.type === 'srflx') {
                const parts = ice.candidate.candidate.split(' ')
                
                // Wait for local description to be set
                while (!pc.localDescription?.sdp) {
                    await new Promise(r => setTimeout(r, 100));
                }

                const iceInfo: ICEInfo = {
                    foundation: parts[0].split(':')[1],
                    component: parts[1],
                    protocol: parts[2].toLowerCase(),
                    priority: parseInt(parts[3], 10),
                    ip: parts[4],
                    port: parseInt(parts[5], 10),
                    type: parts[7],
                    ufrag: ice.candidate.usernameFragment,
                    sdp: pc.localDescription?.sdp,
                };
                
                // Get related address (local IP) if present
                const raddrIndex = parts.indexOf('raddr');
                if (raddrIndex !== -1) {
                    iceInfo.relatedIP = parts[raddrIndex + 1];
                }
                
                // Get related port (local port) if present
                const rportIndex = parts.indexOf('rport');
                if (rportIndex !== -1) {
                    iceInfo.relatedPort = parseInt(parts[rportIndex + 1], 10);
                }
                
                console.log('ICE candidate:', iceInfo);
                candidates.push(iceInfo);
            } else {
                // null candidate means ICE gathering is complete
                console.log('ICE gathering complete. All candidates:', candidates);
                resolve(candidates);
            }
        };
    })
}

export async function createOffer(pc: RTCPeerConnection): Promise<string> {
    // Create data channel
    const dataChannel = pc.createDataChannel('libp2p-webrtc-direct');
    dataChannel.onopen = () => console.log('Data channel opened');
    dataChannel.onmessage = (e) => console.log('Received message:', e.data);
    dataChannel.onclose = () => console.log('Data channel closed');
    dataChannel.onerror = (err) => console.error('Data channel error:', err);

    // Create and set local description
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    return new Promise<ICEInfo[] | null>((resolve) => {

        const candidates: ICEInfo[] = [];

        setTimeout(() => {
            // pc.close()
            resolve({candidates, dataChannel})  // Timeout after 5 seconds
        }, 5000)
        
        pc.onicegatheringstatechange = () => {
            console.log('ICE gathering state:', pc.iceGatheringState);
        };
        pc.onicecandidateerror = (err) => {
            console.log('ICE candidate error:', err);
        };
        pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', pc.iceConnectionState);
        };
        pc.onicecandidate = async (ice) => {
            console.log('ICE candidate-->', ice);
            if (ice.candidate && ice.candidate.type === 'srflx') {
                const parts = ice.candidate.candidate.split(' ');
                
                // Wait for local description to be set
                while (!pc.localDescription?.sdp) {
                    await new Promise(r => setTimeout(r, 100));
                }

                const iceInfo: ICEInfo = {
                    foundation: parts[0].split(':')[1],
                    component: parts[1],
                    protocol: parts[2].toLowerCase(),
                    priority: parseInt(parts[3], 10),
                    ip: parts[4],
                    port: parseInt(parts[5], 10),
                    type: parts[7],
                    ufrag: ice.candidate.usernameFragment,
                    sdp: pc.localDescription?.sdp,
                };
                
                // Get related address (local IP) if present
                const raddrIndex = parts.indexOf('raddr');
                if (raddrIndex !== -1) {
                    iceInfo.relatedIP = parts[raddrIndex + 1];
                }
                
                // Get related port (local port) if present
                const rportIndex = parts.indexOf('rport');
                if (rportIndex !== -1) {
                    iceInfo.relatedPort = parseInt(parts[rportIndex + 1], 10);
                }
                
                candidates.push(iceInfo);
            }
        };
    })
}

export async function handleOffer(pc: RTCPeerConnection, offerSdp: string): Promise<string> {
    // Set up data channel handling
    pc.ondatachannel = (event) => {
        const dataChannel = event.channel;
        dataChannel.onopen = () => console.log('Data channel opened');
        dataChannel.onmessage = (e) => console.log('Received message:', e.data);
        dataChannel.onclose = () => console.log('Data channel closed');
        dataChannel.onerror = (err) => console.error('Data channel error:', err);
    };

    // Set the remote description (other peer's offer)
    await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: offerSdp
    }));

    // Create and set local answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
      // Wait for local description to be set
      while (!pc.localDescription?.sdp) {
        await new Promise(r => setTimeout(r, 100));
    }

    const iceInfo: ICEInfo = {
        foundation: parts[0].split(':')[1],
        component: parts[1],
        protocol: parts[2].toLowerCase(),
        priority: parseInt(parts[3], 10),
        ip: parts[4],
        port: parseInt(parts[5], 10),
        type: parts[7],
        ufrag: ice.candidate.usernameFragment,
        certhash: certString || '',
    }
    
    // Get related address (local 
    // Return the SDP
    return {sdp: pc.localDescription!.sdp, iceInfo: iceInfo};
}

export async function handleAnswer(pc: RTCPeerConnection, answerSdp: string): Promise<void> {
    // Set the remote description (other peer's answer)
    await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: answerSdp
    }));
}