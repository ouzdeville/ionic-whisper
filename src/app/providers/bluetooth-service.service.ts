import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { AlertController, NavController, Platform, ToastController } from "@ionic/angular";
import { LocalNotifications } from "@ionic-native/local-notifications/ngx";
import { BackgroundMode } from "@ionic-native/background-mode/ngx";
import { BluetoothLE } from "@ionic-native/bluetooth-le/ngx";
import { WhisperConfig } from "../utils/ble/config";
import { CryptoTools } from "../utils/ble/crypto";
import { decode, encode } from "base64-ts";
import {
  AdvertisingParams,
  DescriptorParams,
  ScanParams,
  WriteCharacteristicParams,
  OperationResult
} from '@ionic-native/bluetooth-le/ngx';
import { DatabaseService } from '../service/database.service';

@Injectable({
  providedIn: 'root'
})
export class BluetoothServiceService {

  debug = true;
  devices: any[] = [];
  public statusMessage: any;
  public priority: any;

  public my_priority_int: Number;
  public keyPair = {
    id: 0,
    private_key: "",
    public_key: "",
    time_reference: 0,
    expiry_after_sec: 0
  };
  public currentPubKey: any;
  noBluetoothAlertSent: boolean = false;
  //advParams: any = {};
  S_pair: any = [];
  S_connect: any = [];
  protected scanList = new Map<string, Boolean>();
  protected keyMaps = new Map<string, KeyReadQueue>();

  protected keySendMaps = new Map<string, KeyReadQueue>();
  protected priorityMaps = new Map<string, Number>();
  cryptoTools = new CryptoTools();
  whisperConfig: WhisperConfig = new WhisperConfig();
  protected isScanning = false;
  protected isAdvertising = false;
  protected startScanStamp = 0;
  protected isbackgroundMode = false;
  protected eventCode = {
    SCAN_STARTED: (0x00),
    SCAN_STOPPED: (0x01),
    PROCESS_KEYS_START: (0x02),
    PROCESS_KEYS_STOP: (0x03)
  };


  constructor(public navCtrl: NavController,
    private toastCtrl: ToastController,
    public bluetoothle: BluetoothLE,
    private ngZone: NgZone,
    private notifier: LocalNotifications,

    private platform: Platform,

    public backgroundMode: BackgroundMode,
    private db: DatabaseService
  ) {

  }
  startTracking() {
    this.startScan();
    /*this.backgroundMode.enable();
    this.backgroundMode.on("activate").subscribe(() => {
      console.log("BackGroundMode...");
      this.startScan();
    });
    this.backgroundMode.on("deactivate").subscribe(() => {
      console.log("ForGroundMode...");
      this.startScan();
    });*/
  }

  startScan() {
    console.log('test ok');


    this.platform.ready().then((readySource) => {
      if (readySource === 'cordova') {

        /*this.advParams = this.whisperConfig.advAndroidparams;
        if (this.platform.is('ios')) {
          this.advParams = this.whisperConfig.advIOSparams;
        }*/
        this.bluetoothle.initialize({ "request": true, "statusReceiver": false, "restoreKey": "bluetoothleplugin" }).subscribe(result => {
          console.log('#BLE-initialize' + JSON.stringify(result)) // logs 'enabled'
        });
        //init Gatt Server
        this.bluetoothle.initializePeripheral({ "request": true, "restoreKey": "bluetoothleplugin" }).subscribe(result => {
          console.log('#BLE-initializedPeripheral', + JSON.stringify(result));
          this.initializeResult(result);
        });
      }
    });
    //this.backgroundMode.on('enable').subscribe(() => {
    //console.log('(background) start scan')
    // Callback for internal calls
    this.scan();
    //});

    //this.backgroundMode.enable();

  }
  // /**
  //    *
  //    * @param {Number} priority the the priority for scanning
  //    * @param {function} success a callback function for success
  //    * @param {function} error a callback function for error
  //    * @param {JSON} params the advertising parameters
  //    */
  async updateAdvertising(priority, errorProcess, params) {
    const encodedPriority = this.bluetoothle.bytesToEncodedString(priority);


    await this.bluetoothle.isAdvertising().then(result => {

      console.log('isAdvertising:' + JSON.stringify(result));
      let possibleresult = { "isAdvertising": true };
      if (result.status || this.isAdvertising || JSON.stringify(result) == JSON.stringify(possibleresult)) {
        this.bluetoothle.stopAdvertising().then(result => {
          console.log('stopAdvertising' + JSON.stringify(result));
          if (result.status == "advertisingStopped")
            this.isAdvertising = false;
        });
      }

    }).finally(() => {

      if (!this.isAdvertising) {
        params.manufacturerSpecificData = encodedPriority;
        this.bluetoothle.startAdvertising(params).then(result => {
          console.log("startAdvertising" + JSON.stringify(result));
          if (result.status == "advertisingStarted")
            this.isAdvertising = true;
        }).catch(err => errorProcess(err));
      }

    });




  }


  /**
   * 3. Repeat
   * *  - generate a priority , update this.priority
   * *  - startAdvertising by calling updateAdvertising
   * *  - Scan device around and take that has the whisper UUID
   * *  - get the rssi
   * *  - Connect to device by sending the last valid publickey if necessary
   * *  - Get the publickey as response and run the DH and store in databases
   * *  -
   */
  scan() {
    // Doing stuff here

    console.log('scanning');
    if (!this.isScanning) {


      this.S_connect = [];
      this.S_pair = [];
      this.scanList = new Map<string, Boolean>();
      this.keyMaps = new Map<string, KeyReadQueue>();
      this.keySendMaps = new Map<string, KeyReadQueue>();
      this.priorityMaps = new Map<string, Number>();

      this.bluetoothle.isEnabled().then((status) => {
        //if(!status.isEnabled)
        //- generate a priority , update this.priority
        this.priority = this.cryptoTools.generatePriority();
        this.my_priority_int = (this.priority[0] << 8) + this.priority[1];
        console.log("My priority: " + this.my_priority_int);
        //- retrieve my last up to date keyPair from db and set it on this.keyPair
        this.getLastKeyPair();
        /*if (this.debug) {
          this.priority[1] = 0xFE;// just for debugging
        }*/
        //- startAdvertising by calling updateAdvertising
        this.updateAdvertising(this.priority, this.handleError, this.whisperConfig.advParams)

        let scanParams = {
          "services": [
            this.whisperConfig.whisperV3CharacteristicUUID
          ],
          "allowDuplicates": false,
          "scanMode": this.bluetoothle.SCAN_MODE_LOW_LATENCY,
          "matchMode": this.bluetoothle.MATCH_MODE_AGGRESSIVE,
          "matchNum": this.bluetoothle.MATCH_NUM_MAX_ADVERTISEMENT,
          "callbackType": this.bluetoothle.CALLBACK_TYPE_ALL_MATCHES,
        };

        this.bluetoothle.startScan(scanParams).subscribe(result => {
          if (result.status == "scanStarted")
            this.isScanning = true;
          this.startScanStamp = Date.now();
          console.log('#Start Scan' + JSON.stringify(result));
          this.scanResult(result);
        });

      }).catch(err => console.log(err));

      setTimeout(() => {
        //this.bluetoothle.isScanning().then(isScanning => {
        //console.log("is scaning:" + JSON.stringify(isScanning));
        if (this.isScanning) {

          this.bluetoothle.stopScan().then(stopResult => {
            if (stopResult.status == "scanStopped")
              this.isScanning = false;
            console.log('#Stop Scan' + JSON.stringify(stopResult));
            let stopScanStamp = Date.now();
            //mettre à jour la table whisperEvent pour fin de scan
            this.db.addWhisperEvent(stopScanStamp, this.eventCode.SCAN_STOPPED, (stopScanStamp - this.startScanStamp), this.scanList.size, "").then((data) => {
              console.log("WhisperEvent StopScan added  Meet:" + this.scanList.size);
            });



            /* * Pour chque elemt de S_connect
             * * * connect to device
             * * * send ma cle public
             * * * lire la public
             * * * lancer getInteraction
             * * * mettre jour la table 
             * */
            console.log("Size S_connect" + this.S_connect.length);
            this.S_connect.forEach((device) => {
              let subs_connect = this.bluetoothle.connect({
                "address": device.address

              }).subscribe(connectResult => {
                console.log('connect:' + JSON.stringify(connectResult));
                this.sendMyPublicKeyTo(device.address, 0, device.rssi);
                //subs_connect.unsubscribe();
              });
            });

          }).catch(err => console.log(err));
        }
        //}).catch(err => console.log(err));

      }, this.whisperConfig.scannerScanDurationMillis);




      setTimeout(() => { this.scan(); }, this.whisperConfig.scannerWaitDurationMillis);
    }
  }



  // /**
  //  *
  //  * @param result
  //  * status => enabled = Bluetooth is enabled
  //  * status => disabled = Bluetooth is disabled
  //  * status => readRequested = Respond to a read request with respond(). Characteristic (Android/iOS) or Descriptor (Android)
  //  * status => writeRequested = Respond to a write request with respond(). Characteristic (Android/iOS) or Descriptor (Android)
  //  * status => subscribed = Subscription started request, use notify() to send new data
  //  * status => unsubscribed = Subscription ended request, stop sending data
  //  * status => notificationReady = Resume sending subscription updates (iOS)
  //  * status => notificationSent = Notification has been sent (Android)
  //  * status => connected = A device has connected
  //  * status => disconnected = A device has disconnected
  //  * status => mtuChanged = MTU has changed for device
  //  */
  initializeResult(result) {
    console.log("#BLE---initializeResult");
    console.log(JSON.stringify(result));
    //if(result.service == this.whisperConfig.whisperV3CharacteristicUUID) return;
    //this.currentPubKey = this.getLastKeyPair();
    if (result.status === "enabled") {
      console.log('#BLE-Status:', result.status + "-- Adding service")
      this.bluetoothle.addService(this.whisperConfig.serviceParam).then(serviceresult => {
        console.log('#BLE-addService' + JSON.stringify(serviceresult))
      }).catch(err => console.log(err));
    }
    else if (result.status === "writeRequested") {
      console.log('#BLE-Status:', result.status + "-- Reading his pubkey")
      // -waiting for receiving a write request -> read his pubkey
      var paramswr = {
        "address": result.address,
        "requestId": result.requestId,
        "value": this.bluetoothle.bytesToEncodedString(this.bluetoothle.stringToBytes(this.keyPair.public_key))
      };
      //à revoir car ça risq d'envoyer un readRequest
      this.bluetoothle.respond(paramswr).then(respondresult => {
        console.log('#BLE-Reply' + JSON.stringify(respondresult))
      }).catch(err => console.log(err));
      if (!this.keyMaps.has(result.address)) {
        this.keyMaps.set(result.address, new KeyReadQueue(this.bluetoothle));
      }
      let his_keyQueue = this.keyMaps.get(result.address);
      his_keyQueue.pushKeyPart(result.requestId, result.value);

      if (his_keyQueue.isCompleted()) {
        let his_pubkey = his_keyQueue.getPublicKey();
        this.keyMaps.delete(result.address);
        if (this.debug)
          console.log("His public Key:" + his_pubkey);
        //diffie-hellman set data into ping, pear or connect
        let rssi = 0;//to be computed based KeyValue . It is not sure to get it at scanning stage 
        this.bluetoothle.rssi({ "address": result.address }).then(rssiResult => {
          rssi = rssiResult.rssi;
        });
        this.process_diffie_hellman(this.keyPair, his_pubkey, result, 0, 0, rssi);
      }

    } else if (result.status === "readRequested") {
      console.log('#BLE-Status:', result.status + "-- Sending my pubkey")
      // -waiting for receiving a read request -> send my pubkey! The key size is 32 bytes 
      var paramswr = {
        "address": result.address,
        "requestId": result.requestId,
        "value": ""
      };
      let middle = Math.round(this.keyPair.public_key.length / 2);
      if (!this.keySendMaps.has(result.address)) {
        this.keySendMaps.set(result.address, new KeyReadQueue(this.bluetoothle));
        paramswr.value = this.bluetoothle.bytesToEncodedString(this.bluetoothle.
          stringToBytes(this.keyPair.public_key.substring(0, middle)));
        console.log("First Response from GATT:" + paramswr.value);
      } else {
        paramswr.value = this.bluetoothle.bytesToEncodedString(this.bluetoothle.
          stringToBytes(this.keyPair.public_key.substring(middle, this.keyPair.public_key.length)));
        this.keySendMaps.delete(result.address);
        console.log("Second Response from GATT:" + paramswr.value);
      }
      //à revoir car ça risq d'envoyer un readRequest
      this.bluetoothle.respond(paramswr).then(respondresult => {
        console.log('#BLE-Reply-MyKey' + JSON.stringify(respondresult))
      }).catch(err => console.log(err));
    }
    else if (result.status === "connected") {
      if (this.debug)
        console.log('#BLE-Status:', result.status + "-- Sharing data available");
      if (this.debug)
        console.log('#BLE-Device:', result.address);
    }
    else if (result.status === "disconnected") {
      this.bluetoothle.reconnect(result.address);
    }
  }

  scanResult(device: any) {
    /**
     * * recupé rer la priorité de l'autre device sur le manufacturerSpecificData
     * * si la priorité est inférieure à la mienne ou la ma clé à changer alors ajouter ce device à la list S_connect
     * * else ajouter à la liste S_pair
     */
    console.log("scanResult: New Device:" + JSON.stringify(device))
    console.log("this.scanList.includes " + this.scanList.has(device.address));
    if (device.status === "scanResult" && !this.scanList.has(device.address)) {
      this.scanList.set(device.address, false);
      let manufacturerData: any;

      if (typeof device.advertisement !== 'string') {
        //this.platform.is('ios')
        manufacturerData = this.bluetoothle.encodedStringToBytes(device.advertisement.manufacturerData)
      } else {
        manufacturerData = this.bluetoothle.encodedStringToBytes(device.advertisement)
      }

      //console.log("manufacturerData: New Device:" + manufacturerData);
      var his_priority = (manufacturerData[7] << 8) + manufacturerData[8];
      console.log("His Prio: " + his_priority + "--- My Prio:" + this.my_priority_int);

      let his_value = {
        "rssi": device.rssi,
        "name": device.name,
        "address": device.address,
        "priority": his_priority,
        "connect_time_ms": Date.now()
      };
      //let new_keyPair = this.getLastKeyPair();

      let lastConnect;
      let mustThrottle = false;
      this.db.getLastConnect(this.cryptoTools.doHash(device.address)).then(lastConnect => {
        if (lastConnect != null) {
          mustThrottle = his_value.connect_time_ms < lastConnect.connect_time_ms + this.whisperConfig.mustReconnectAfterMillis;
          console.log("mustThrottle :" + mustThrottle);
          if (mustThrottle) {
            this.db.addBlePingEvent(his_value.connect_time_ms, his_value.rssi,
              this.whisperConfig.pingMaxElapsedTimeMillis,
              lastConnect.private_encounter_token_id).then((data) => {
                console.log("Ping Event add for :" + his_value.address);
              });
          }
        }
      }).then(() => {
        if (his_value.priority < this.my_priority_int && !mustThrottle) {
          if (this.debug)
            console.log("ADD to S_connect ....");
          this.S_connect.push(his_value);

        }

      });

    }
  }


  sendMyPublicKeyTo(address: string, adv_v: number, rssi: number) {
    this.bluetoothle.isConnected({
      "address": address
    }).then(connection => {
      if (connection.isConnected) {
        this.bluetoothle.discover({
          "address": address,
          "clearCache": true
        }).then(discoverResult => {
          /*if (this.debug)
            console.log('discoverResult:' + JSON.stringify(discoverResult));*/

          discoverResult.services.forEach((service) => {

            if (service.uuid === this.whisperConfig.whisperV3CharacteristicUUID) {

              const cuuid = service.characteristics[0].uuid;

              //send data notice that write sends less than 20bytes
              console.log("EncodedClient key to send:" + this.bluetoothle.bytesToEncodedString(this.bluetoothle.stringToBytes(this.keyPair.public_key)))
              this.bluetoothle.writeQ({
                "value": this.bluetoothle.bytesToEncodedString(this.bluetoothle.stringToBytes(this.keyPair.public_key)),
                "service": this.whisperConfig.whisperV3CharacteristicUUID,
                "characteristic": cuuid,
                "type": "noResponse",
                "address": address
              }).then(writeQresult => {
                console.log('writeQ:' + JSON.stringify(writeQresult));
                if (writeQresult.status == "written") {
                  this.scanList.set(address, true);
                }
                else {
                  this.scanList.set(address, false);
                }
              }).finally(() => {

                //Read First Part of the Key
                console.log("Searching Server public Key ...");
                this.bluetoothle.read({
                  "address": address,
                  "service": this.whisperConfig.whisperV3CharacteristicUUID,
                  "characteristic": cuuid
                }).then(readResult => {
                  //console.log('readResult1:' + JSON.stringify(readResult));
                  let value = this.bluetoothle.bytesToString(this.bluetoothle.encodedStringToBytes(readResult.value));
                  //console.log('Decoding Key1 GATT Server:' + value);
                  this.keyMaps.set(address, new KeyReadQueue(this.bluetoothle));
                  let his_keyQueue = this.keyMaps.get(address);
                  his_keyQueue.pushKeyPart(1, readResult.value);
                }).finally(() => {

                  //Read Second Part of the Key
                  this.bluetoothle.read({
                    "address": address,
                    "service": this.whisperConfig.whisperV3CharacteristicUUID,
                    "characteristic": cuuid
                  }).then(readResult2 => {
                    //console.log('readResult2:' + JSON.stringify(readResult2));
                    let value = this.bluetoothle.bytesToString(this.bluetoothle.encodedStringToBytes(readResult2.value));
                    //console.log('Decoding Key2 GATT Server:' + value);
                    let his_keyQueue = this.keyMaps.get(address);
                    his_keyQueue.pushKeyPart(2, readResult2.value);
                    let his_pubkey = his_keyQueue.getPublicKey().substring(0, this.keyPair.public_key.length);
                    this.keyMaps.delete(address);
                    if (this.debug)
                      console.log("Server public Key:" + his_pubkey);
                    //diffie-hellman set data into ping, pear or connect
                    this.process_diffie_hellman(this.keyPair, his_pubkey, readResult2, 1, adv_v, rssi);

                  }).catch(err => console.log(err));

                }).catch(err => console.log(err));

              });






            }

          });
        }).catch(err => console.log(err));



      }



    }).catch(err => console.log(err));



  }


  getLastKeyPair() {

    let time_reference = Date.now();
    if (this.keyPair.id == 0 || time_reference > (this.keyPair.time_reference + this.keyPair.expiry_after_sec * 1000)) {
      this.db.getLastUserKeyPair().then((pair) => {
        console.log("New keyPair from DB:" + JSON.stringify(pair));
        if (pair == null || time_reference > (pair.time_reference + pair.expiry_after_sec * 1000)) {
          if (this.debug)
            console.log("New Key Pair");
          let dhkey = this.cryptoTools.generateKeyPair();
          this.db.addKeypair(dhkey.private_key, dhkey.public_key, time_reference, this.whisperConfig.pubkeyValidityPeriodSec).then((result) => {
            this.keyPair = {
              id: result.insertId,
              private_key: dhkey.private_key,
              public_key: dhkey.public_key,
              time_reference: time_reference,
              expiry_after_sec: this.whisperConfig.pubkeyValidityPeriodSec
            }

            console.log("New Key Pair saved on DB:" + result.insertId);
            //console.log("keyPair:" + JSON.stringify(keyPair));

          });
        } else {
          this.keyPair = pair;
        }
      });
    }

    console.log("keyPair:" + JSON.stringify(this.keyPair));
    //TODO with @Junior
    /*if (!this.debug) {
      keyPair.public_key = "Q2UyDI59OMY+OMyIZ29xBWugpsBs5a8tyTTlifLHjTE=";
      keyPair.private_key = "cMp/vTtLBZS6c6wIQgVgx1aTD8kzARdCI8VRDOSBxHI=";
    }*/
    return this.keyPair;
  }
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getLastConnect(address: string) {
    this.db.getLastConnect(this.cryptoTools.doHash(address)).then(connect => {
      return connect;
    });
  }


  process_diffie_hellman(keyPair, publicKey: string, deviceInfo, initiator: number, adv_v: number, rssi: number) {
    /*if (this.debug) {
      console.log('Diffie_Hellman-keyPair:' + JSON.stringify(keyPair));
      console.log('Diffie_Hellman-publicKey:' + JSON.stringify(publicKey));
    }*/
    let tokenPair = this.cryptoTools.getInteraction(keyPair, publicKey);
    console.log('Diffie_Hellman:' + JSON.stringify(tokenPair));
    //seach this hear token if existe store just connectEvent else create PrivateEncounter and create token
    let hashMacValue = this.cryptoTools.doHash(deviceInfo.address);
    let stamptime = Date.now();
    this.db.getHearToken(tokenPair.tell_token).then((hear) => {
      if (hear != null) {
        this.db.addBleConnectEvent(
          initiator,
          hashMacValue,
          stamptime,
          this.whisperConfig.organizationCode,
          adv_v,
          publicKey,
          rssi,
          hear.id
        ).then((coonect) => {
          console.log("#BLE-DB-addConnect" + JSON.stringify(coonect));
        });
      } else {
        this.db.addPrivateEncounterToken(tokenPair.tell_token, tokenPair.hear_token,
          hashMacValue, stamptime, 0, "daancovid")
          .then((peresult) => {
            console.log("#BLE-DB-addTOken" + JSON.stringify(peresult));
            this.db.addBleConnectEvent(
              initiator,
              hashMacValue,
              stamptime,
              this.whisperConfig.organizationCode,
              adv_v,
              publicKey,
              rssi,
              peresult.insertId
            ).then((coonect) => {
              console.log("#BLE-DB-addConnect" + JSON.stringify(coonect));
            });
          });

      }

    });


    //save it
  }


  handleError(error) {

    var msg;

    if (error.error && error.message) {

      var errorItems = [];

      if (error.service) {

        errorItems.push("service: " + (error.service));
      }

      if (error.characteristic) {

        errorItems.push("characteristic: " + (error.characteristic));
      }

      msg = "Error on " + error.error + ": " + error.message + (errorItems.length && (" (" + errorItems.join(", ") + ")"));
    }

    else {

      msg = error;
    }

    console.log(msg, "error");
  }
  protected prepareBackgroundMode() {

    this.isbackgroundMode = true;
  }



}

class KeyReadQueue {
  protected publicKeyparts = new Map<number, string>();
  public constructor(protected bluetoothLE: BluetoothLE) { }
  pushKeyPart(requestId: number, pubKeyPart: string) {
    this.publicKeyparts.set(requestId, pubKeyPart);
  }

  isCompleted() {
    let tempkey = this.getPublicKey();
    console.log("Decoding:" + tempkey + " ----byte size:" + decode(tempkey).length);
    return (decode(tempkey).length == 32);
  }

  getPublicKey() {
    let tempkey = "";
    let keys = [...this.publicKeyparts.keys()];
    let sortedIds = keys.sort((x, y) => {
      return x - y;
    });
    sortedIds.forEach((id) => {
      tempkey += this.bluetoothLE.bytesToString(this.bluetoothLE.encodedStringToBytes(this.publicKeyparts.get(id)));
    });
    return tempkey;
  }




}
