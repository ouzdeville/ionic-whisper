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
  WriteCharacteristicParams
} from '@ionic-native/bluetooth-le/ngx';

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
    pubKey: "",
    prvKey: ""
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
    protected scanTimeout;
    protected isbackgroundMode = false;


  constructor(public navCtrl: NavController,
    private toastCtrl: ToastController,
    public bluetoothle: BluetoothLE,
    private ngZone: NgZone,
    private notifier: LocalNotifications,

    private platform: Platform,

    public backgroundMode: BackgroundMode
  ) {

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
      if (result.status || JSON.stringify(result) == JSON.stringify(possibleresult)) {
        this.bluetoothle.stopAdvertising().then(result => {
          console.log('stopAdvertising' + JSON.stringify(result));
        });
      }
    }).finally(() => {
      params.manufacturerSpecificData = encodedPriority;
      this.bluetoothle.startAdvertising(params).then(result => {
        console.log("startAdvertising" + JSON.stringify(result));
      }).catch(err => errorProcess(err));
    });




  }


  /**
   * 3. Repeat
   * *  - generate a priority , update this.priority
   * *  - startAdvertising by calling updateAdvertising
   * *  - Scan device around and take that has the whisper UUID
   * *  - get the rssi
   * *  - Connect to device by sending the last valid publickey
   * *  - Get the publickey as response and run the DH
   * *  -
   */
  scan() {
    // Doing stuff here

    console.log('scanning');
    this.S_connect = [];
    this.S_pair = [];
    this.scanList = new Map<string, Boolean>();
    this.keyMaps = new Map<string, KeyReadQueue>();
    this.keySendMaps = new Map<string, KeyReadQueue>();
    this.priorityMaps = new Map<string, Number>();

    this.bluetoothle.isEnabled()
      .then(() => {
        this.devices = [];
        //- generate a priority , update this.priority
        this.priority = this.cryptoTools.generatePriority();
        this.my_priority_int = (this.priority[0] << 8) + this.priority[1];
        console.log("My priority: " + this.my_priority_int);
        //- retrieve my last up to date keyPair from db and set it on this.keyPair
        this.keyPair = this.getLastKeyPair();
        /*if (this.debug) {
          this.priority[1] = 0xFE;// just for debugging
        }*/
        //- startAdvertising by calling updateAdvertising
        this.updateAdvertising(this.priority, this.handleError, this.whisperConfig.advParams)



        /**Scan device around and take that has the whisper UUID
         * lancer le scan
         * * recupérer la priorité de l'autre device sur le manufacturerSpecificData à l'id
         * nodleBluetoothManufacturerId
         * * si la priorité est inférieure à la mienne ou la ma clé à changer alors ajouter
         * ce device à la list S_connect
         * * else ajouter à la liste S_pair
         * * mettre à jour la table whisperEvent
         * * keyPair = currentPubKey
         * * parcourir la liste S_pair et vérifier si la dernière date de connexion est inférieur
         * à
         * * lastConnect != null && mustThrottle =now < lastConnect.connectTimeMillis + this.whisperConfig.mustReconnectAfterMillis
         * * si mustThrottle == true alors mettre à jour la table ping
         * * Pour chque elemt de S_connect
         * * * lire la public
         * * * send ma cle public
         * * * lancer getInteraction
         * * * mettre jour la table connect
         */
        let scanParams = {
          "services": [
            this.whisperConfig.whisperV3CharacteristicUUID
          ],
          "allowDuplicates": true,
          "scanMode": this.bluetoothle.SCAN_MODE_LOW_LATENCY,
          "matchMode": this.bluetoothle.MATCH_MODE_AGGRESSIVE,
          "matchNum": this.bluetoothle.MATCH_NUM_MAX_ADVERTISEMENT,
          "callbackType": this.bluetoothle.CALLBACK_TYPE_ALL_MATCHES,
        };
        this.bluetoothle.startScan(scanParams).subscribe(result => {
          console.log('#Start Scan' + JSON.stringify(result));
          this.scanResult(result);
        });

      }).catch(err => console.log(err));

    setTimeout(() => {
      this.bluetoothle.isScanning().then(isScanning => {
        console.log("is scaning:" + JSON.stringify(isScanning));
        if (isScanning.isScanning) {
          this.bluetoothle.stopScan().then(stopResult => {
            console.log('#Stop Scan' + JSON.stringify(stopResult));

            //mettre à jour la table whisperEvent pour fin de scan
            //this.updateEventTable(WhisperEvent(System.currentTimeMillis(), EventCode.SCAN_STOPPED.code, (stopScan-startScan).toInt(),peerSet.size,""));

            /* * Pour chque elemt de S_connect
             * * * connect to device
             * * * send ma cle public
             * * * lire la public
             * * * lancer getInteraction
             * * * mettre jour la table connect
             * */
            console.log("Size S_connect" + this.S_connect.length);
            this.S_connect.forEach((device) => {
              let subs_connect = this.bluetoothle.connect({
                "address": device.address

              }).subscribe(connectResult => {
                console.log('connect:' + JSON.stringify(connectResult));
                this.sendMyPublicKeyTo(device.address);
                //subs_connect.unsubscribe();
              });
            });

          }).catch(err => console.log(err));
        }
      }).catch(err => console.log(err));

    }, this.whisperConfig.scannerScanDurationMillis);




    setTimeout(() => { this.scan(); }, this.whisperConfig.scannerWaitDurationMillis);
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
        "value": this.bluetoothle.bytesToEncodedString(this.bluetoothle.stringToBytes(this.keyPair.pubKey))
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
        //send back Key if needed 
        /*if (!this.scanList.get(result.address)) {
          console.log("Send Key as Server");
          this.sendMyPublicKeyTo(result.address);

        }*/
        //dont forget to send my public key
        if (this.debug)
          console.log("His public Key:" + his_pubkey);
        //diffie-hellman set data into ping, pear or connect
        this.process_diffie_hellman(this.keyPair, his_pubkey, result);


      }

    } else if (result.status === "readRequested") {
      console.log('#BLE-Status:', result.status + "-- Sending my pubkey")
      // -waiting for receiving a read request -> send my pubkey! The key size is 32 bytes 

      var paramswr = {
        "address": result.address,
        "requestId": result.requestId,
        "value": ""
      };
      let middle = Math.round(this.keyPair.pubKey.length / 2);
      if (!this.keySendMaps.has(result.address)) {
        this.keySendMaps.set(result.address, new KeyReadQueue(this.bluetoothle));
        paramswr.value = this.bluetoothle.bytesToEncodedString(this.bluetoothle.
          stringToBytes(this.keyPair.pubKey.substring(0, middle)));
        console.log("First Response from GATT:" + paramswr.value);
      } else {
        paramswr.value = this.bluetoothle.bytesToEncodedString(this.bluetoothle.
          stringToBytes(this.keyPair.pubKey.substring(middle, this.keyPair.pubKey.length)));
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
      /*
      {
        "status":"connected",
        "address":"5163F1E0-5341-AF9B-9F67-613E15EC83F7",
      }
      */
    }
    else if (result.status === "disconnected") {
      /*
      {
        "status":"disconnected",
        "address":"5163F1E0-5341-AF9B-9F67-613E15EC83F7",
      }
      */
    }


  }

  // /**
  //  *
  //  * @param result
  //  * status => scanStarted = Scan has started
  //     status => scanResult = Scan has found a device
  //  */
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
        "priority": his_priority
      };
      //let new_keyPair = this.getLastKeyPair();
      let now = new Date();
      if (his_value.priority < this.my_priority_int) {
        //this.keyPair = new_keyPair;
        let lastConnect = this.getLastConnect(his_value.address);
        let mustThrottle = false;
        // mustThrottle =now < lastConnect.connectTimeMillis + this.whisperConfig.mustReconnectAfterMillis;
        if (lastConnect != null && mustThrottle) {
          //add to ping table
          this.addPing(lastConnect, his_value.rssi, now, this.whisperConfig.pingMaxElapsedTimeMillis);
        }
        else {
          if (this.debug)
            console.log("ADD to S_connect ....");
          this.S_connect.push(his_value);
        }
      } else {
        if (this.debug)
          console.log("ADD to S_pair ....");
        this.S_pair.push(his_value);
      }


    }


  }


  sendMyPublicKeyTo(address: string) {
    this.bluetoothle.isConnected({
      "address": address
    }).then(connection => {
      if (connection.isConnected) {
        this.bluetoothle.discover({
          "address": address,
          "clearCache": true
        }).then(discoverResult => {
          if (this.debug)
            console.log('discoverResult:' + JSON.stringify(discoverResult));

          discoverResult.services.forEach((service) => {

            if (service.uuid === this.whisperConfig.whisperV3CharacteristicUUID) {

              const cuuid = service.characteristics[0].uuid;

              //send data notice that write sends less than 20bytes
              console.log("EncodedClient key to send:" + this.bluetoothle.bytesToEncodedString(this.bluetoothle.stringToBytes(this.keyPair.pubKey)))
              this.bluetoothle.writeQ({
                "value": this.bluetoothle.bytesToEncodedString(this.bluetoothle.stringToBytes(this.keyPair.pubKey)),
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
                    let his_pubkey = his_keyQueue.getPublicKey().substring(0,this.keyPair.pubKey.length);
                    this.keyMaps.delete(address);
                    if (this.debug)
                      console.log("Server public Key:" + his_pubkey);
                    //diffie-hellman set data into ping, pear or connect
                    this.process_diffie_hellman(this.keyPair, his_pubkey, readResult2);

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

    let keyPair = {
      pubKey: "",
      prvKey: ""
    };

    //keyPair = this.cryptoTools.generateKeyPair();

    if (this.debug) {
      keyPair = {
        pubKey: "Q2UyDI59OMY+OMyIZ29xBWugpsBs5a8tyTTlifLHjTE=",
        prvKey: "cMp/vTtLBZS6c6wIQgVgx1aTD8kzARdCI8VRDOSBxHI="
      }
    }
    console.log("keyPair:" + JSON.stringify(keyPair));
    //TODO with @Junior

    return keyPair;
  }
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getLastConnect(address: string) {
    return -1;
  }
  addPing(petRowId, rssi, now, pingMaxElapsedTimeMillis) {

  }

  process_diffie_hellman(keyPair, publicKey, deviceInfo) {
    let tokenPair = this.cryptoTools.getInteraction(keyPair, publicKey);
    console.log('Diffie_Hellman:' + JSON.stringify(tokenPair));
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

    this.isbackgroundMode=true;
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
