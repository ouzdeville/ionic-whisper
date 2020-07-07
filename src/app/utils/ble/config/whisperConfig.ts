
import { Injectable } from '@angular/core';


export class WhisperConfig {
  constructor() {}
    /* organization code */
    organizationCode= 0x01;

    /* location tracker parameters */
    enablePrivacyBox= false;
    locationUpdateDistance= 0.0;
    locationUpdateIntervalMillis= 120000; // 2 minutes

    /* Secure Id Parameters */
    pubkeyValidityPeriodSec= 1800; // 30 minutes
    incubationPeriod= 3600*24* 7.0 * 3.0;  // 3 weeks

    /* BLE advertising */
    nodleBluetoothManufacturerId= 0x076c;
    nodlePayloadTypeWhisper= 0x03;

    /* BLE Scanner logic */
    scannerWaitDurationMillis= 60 * 1000; // 1 minute
    scannerScanDurationMillis= 8 * 1000;  // 8 seconds
    mustReconnectAfterMillis= 30 * 60 * 1000; // 30 minutes
    pingMaxElapsedTimeMillis= 5 * 60 * 1000; // 5 minutes

    /* GATT services and characteristics */
    //whisperServiceUUID= "1e91022a-4c2a-434d-be23-d39eb6cd4952";
    //whisperV1CharacteristicUUID= "4d5c8851-6210-425f-8ab9-df679779a3b4"; // EBID
    whisperV3CharacteristicUUID= "645ED98F-D6B0-46B5-A1A5-CE32BBF09232"; // PET
    


    /*Advertising params*/
    advAndroidparams= {
        "service":this.whisperV3CharacteristicUUID, //Android
        "name":"DaanCovid19",
        "manufacturerId":this.nodleBluetoothManufacturerId,
        "manufacturerSpecificData":'',//whisper priority for a specific advertising
        "mode":"lowLatency",
        "connectable":true,
        "timeout":0,
        "txPowerLevel":"high",
        "includeDeviceName":false,
        "includeTxPowerLevel":false
      };
      advIOSparams= {
        "services":[this.whisperV3CharacteristicUUID], //iOS
        "name":"DaanCovid19",
        "manufacturerId":this.nodleBluetoothManufacturerId,
        "manufacturerSpecificData":'', //whisper priority for a specific advertising
        "mode":"lowLatency",
        "connectable":true,
        "timeout":0,
        "txPowerLevel":"high",
        "includeDeviceName":false,
        "includeTxPowerLevel":false
      };

      serviceParam = {
        service: this.whisperV3CharacteristicUUID,
        characteristics: [
          {
            uuid: "ABCD",
            permissions: {
              read: true,
              write: true,
            },
            properties: {
              read: true,
              writeWithoutResponse: true,
              write: true,
              notify: true,
              indicate: true,
            }
          }
        ]
      };;
}
