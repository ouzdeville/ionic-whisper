import { WhisperConfig } from '../config';
import { sharedKey, generateKeyPair } from 'curve25519-js';
import { randomBytes,hash,decodeUTF8, blake2b} from "tweetnacl-ts";
import { decode,encode} from "base64-ts";
import { Injectable } from '@angular/core';



export class CryptoTools {
    whisperConfig:WhisperConfig=new WhisperConfig();
    tokenSize=20;
    constructor() {}
    
    generateKeyPair() {

        const seed = randomBytes(32);
        let brutKeyPair = generateKeyPair(seed);

        let keyPair = {
            public_key: encode(brutKeyPair.public),
            private_key: encode(brutKeyPair.private)
        };
        return keyPair;
    }

    getInteraction(keyPair, peerPubKey) {
        const myPriv = decode(keyPair.private_key);

        const hisPub = decode(peerPubKey);

        const sharedSecret = sharedKey(myPriv, hisPub);
        // Compute  tokens
        let localToken = this.dohashMac(sharedSecret, keyPair.public_key);
        let peerToken = this.dohashMac(sharedSecret, peerPubKey);
        let tokenPair = {
            tell_token: localToken,
            hear_token: peerToken
        };
        return tokenPair;
    }

    dohashMac(sharedSecret:Uint8Array, dataPub:Uint8Array) {
       let mac= blake2b(dataPub, sharedSecret,this.tokenSize)
        return encode(mac);
    }
    generatePriority() {
        const buf = randomBytes(2);
        buf[0] = this.whisperConfig.nodlePayloadTypeWhisper;
        
        return buf;
    }

    doHash(message:string){
        return encode(hash(decodeUTF8(message)));
    }


}