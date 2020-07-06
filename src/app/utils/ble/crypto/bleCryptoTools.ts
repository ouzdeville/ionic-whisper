import { WhisperConfig } from '../config';
import { sharedKey, generateKeyPair } from 'curve25519-js';
import { randomBytes, auth} from "tweetnacl-ts";
import { decode,encode} from "base64-ts";
import { Injectable } from '@angular/core';



export class CryptoTools {
    whisperConfig:WhisperConfig=new WhisperConfig();
    constructor() {}
    
    generateKeyPair() {
        const seed = randomBytes(32);
        let brutKeyPair = generateKeyPair(seed);

        let keyPair = {
            pubKey: encode(brutKeyPair.public),
            prvKey: encode(brutKeyPair.private)
        };
        return keyPair;
    }

    getInteraction(keyPair, peerPubKey) {
        const myPriv = decode(keyPair.prvKey);

        const hisPub = decode(peerPubKey);

        const sharedSecret = sharedKey(myPriv, hisPub);
        // Compute  tokens
        let localToken = this.dohashMac(sharedSecret, keyPair.pubKey);
        let peerToken = this.dohashMac(sharedSecret, peerPubKey);
        let tokenPair = {
            localToken: localToken,
            peerToken: peerToken
        };
        return tokenPair;
    }

    dohashMac(sharedSecret:Uint8Array, dataPub:Uint8Array) {
       let mac= auth(dataPub, sharedSecret)
        return encode(mac);
    }
    generatePriority() {
        const buf = randomBytes(2);
        buf[0] = this.whisperConfig.nodlePayloadTypeWhisper;
        
        return buf;
    }


}