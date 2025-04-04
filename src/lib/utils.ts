import { mnemonicToSeedSync } from "bip39";
import HDKey from "hdkey";
import { createHash } from 'crypto';
import { writable } from 'svelte/store';
import { keys }  from 'libp2p-crypto';
import { fromString as uint8ArrayFromString, toString as uint8ArrayToString } from 'uint8arrays';
import { createFromPrivKey } from '@libp2p/peer-id-factory'
/**
 * Make an sha256 hash
 * @param (string) input
 * @returns {Promise<string>}
 */
export async function sha256(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * ConvertTo32BitSeed: Takes our masterSeed with 64 bit and converts it deterministically to 32 bit seed
 * @param origSeed
 * @returns {Buffer}
 */
export function convertTo32BitSeed (origSeed) {
    const hash = createHash('sha256');
    hash.update(origSeed);
    return hash.digest();
}
/**
 * Generates a master seed from a mnemonic and a password
 * @type {{return: string}}
 */
export const generateMasterSeed = (mnemonicSeedphrase, password, toHex = false) => {
  if(toHex) {
    return mnemonicToSeedSync(mnemonicSeedphrase, password ? password : "mnemonic").toString("hex")
  } else {
    return mnemonicToSeedSync(mnemonicSeedphrase, password ? password : "mnemonic")
  }
}

/**
 * libp2p needs a PeerId which we generate from a seed phrase  
 */
import type { PeerId } from '@libp2p/interface'
import type { PrivateKey } from 'libp2p-crypto'

export async function createPeerIdFromSeedPhrase(seedPhrase: string): Promise<{peerId: PeerId, privateKey: PrivateKey}> { 
  const masterSeed = generateMasterSeed(seedPhrase, "password");
  const {keyPair, hex} = await generateAndSerializeKey(masterSeed.subarray(0, 32))
  const encoded = uint8ArrayFromString(hex, 'hex')
  const privateKey = await keys.unmarshalPrivateKey(encoded)
  const peerId = await createFromPrivKey(privateKey)
  return {peerId, privateKey}
}


export const createHdKeyFromMasterKey = (masterseed, network) => {
    return HDKey.fromMasterSeed(Buffer.from(masterseed, "hex"), network)
}

export async function generateAndSerializeKey(seed: Uint8Array): Promise<string> {
  // Generate an Ed25519 key pair from the seed
  // const keyPair = await keys.generateKeyPairFromSeed('Ed25519', seed);
  const keyPair = await keys.generateKeyPairFromSeed('Ed25519', seed)
  const marshalledPrivateKey = await keys.marshalPrivateKey(keyPair);
  return {keyPair, hex: Buffer.from(marshalledPrivateKey).toString('hex')}
}

export async function createKeyPairFromPrivateKey(privateKey: Buffer) {
    return keys.supportedKeys.ed25519.unmarshalEd25519PrivateKey(privateKey);
}
  

// Utility function to create a store that syncs with localStorage
export function localStorageStore(key, initialValue) {
  const storedValue = localStorage.getItem(key);
  const store = writable(storedValue !== null ? JSON.parse(storedValue) : initialValue);

  store.subscribe(value => {
    localStorage.setItem(key, JSON.stringify(value));
  });

  return store;
}
