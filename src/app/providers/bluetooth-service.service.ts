import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { AlertController, NavController, Platform, ToastController } from "@ionic/angular";
import { LocalNotifications } from "@ionic-native/local-notifications/ngx";
import { BackgroundMode } from "@ionic-native/background-mode/ngx";
import { BluetoothLE } from "@ionic-native/bluetooth-le/ngx";
import { WhisperConfig } from "../utils/ble/config";
import { CryptoTools } from "../utils/ble/crypto";
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
  advParams: any = {};
  S_pair: any = [];
  S_connect: any = [];
  cryptoTools = new CryptoTools();
  whisperConfig: WhisperConfig = new WhisperConfig();


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

        this.advParams = this.whisperConfig.advAndroidparams;
        if (this.platform.is('ios')) {
          this.advParams = this.whisperConfig.advIOSparams;
        }
        this.bluetoothle.initialize({ "request": true, "statusReceiver": false, "restoreKey": "bluetoothleplugin" }).subscribe(result => {
          console.log('#BLE-initialize' + JSON.stringify(result)) // logs 'enabled'
        });
        //init Gatt Server
        this.bluetoothle.initializePeripheral({ "request": true, "restoreKey": "bluetoothleplugin" }).subscribe(result => {
          console.log('#BLE-initializedPeripheral', + JSON.stringify(result));
          this.initializeResult(result);
        });
        this.keyPair = this.getLastKeyPair();
      }
    });
    //this.backgroundMode.on('enable').subscribe(() => {
    console.log('(background) start scan')
    // Callback for internal calls
    this.scan();
    //});

    this.backgroundMode.enable();

  }
  // /**
  //    *
  //    * @param {Number} priority the the priority for scanning
  //    * @param {function} success a callback function for success
  //    * @param {function} error a callback function for error
  //    * @param {JSON} params the advertising parameters
  //    */
  async updateAdvertising(priority, success, error, params) {
    const encodedPriority = this.bluetoothle.bytesToEncodedString(priority);
    console.log("priority: " + encodedPriority);
    await this.bluetoothle.isAdvertising().then(result => {
      console.log('isAdvertising:' + JSON.stringify(result));
      let possibleresult = { "isAdvertising": true };
      if (result.status || JSON.stringify(result) == JSON.stringify(possibleresult)) {
        this.bluetoothle.stopAdvertising().then(result => {
          console.log('stopAdvertising' + JSON.stringify(result));
        });
      }
    });

    params.manufacturerSpecificData = encodedPriority;
    this.bluetoothle.startAdvertising(params).then(result => {
      console.log("startAdvertising" + JSON.stringify(result));
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

    this.bluetoothle.isEnabled()
      .then(() => {
        this.devices = [];
        //- generate a priority , update this.priority
        this.priority = this.cryptoTools.generatePriority();
        this.my_priority_int = (this.priority[0] << 8) + this.priority[1];
        /*if (this.debug) {
          this.priority[1] = 0xFE;// just for debugging
        }*/
        //- startAdvertising by calling updateAdvertising
        this.updateAdvertising(this.priority, this.startAdvertisingSuccess, this.handleError, this.advParams)

        //- retrieve my last up to date keyPair from db and set it on this.keyPair
        this.currentPubKey = this.getLastKeyPair();

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

      }).catch(() => {
        if (!this.noBluetoothAlertSent) {
          this.notifier.schedule({
            id: 1,
            text: 'allumez votre bluetooth pour ....',
            data: { secret: '' }
          });
          this.noBluetoothAlertSent = true;
        }
      });

    setTimeout(() => {
      this.bluetoothle.isScanning().then(isScanning => {
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
              this.bluetoothle.connect({
                "address": device.address

              }).subscribe(connectResult => {
                console.log('connect:' + JSON.stringify(connectResult));
                this.bluetoothle.discover({
                  "address": device.address,
                  "clearCache": true
                });
                this.bluetoothle.write({
                  "value": this.keyPair.pubKey,
                  "service": this.whisperConfig.whisperV3CharacteristicUUID,
                  "characteristic": "ABCD",
                  "type": "withResponse",
                  "address": device.address
                }).then(result => {
                  console.log('Write:', result.status);
                  console.log('Address:', device.address);
                  console.log('His key from write:', result.value);
                  //diffie-hellman set data into ping, pear or connect
                  this.process_diffie_hellman(this.keyPair, result.value);
                });
              });
            });
            this.S_connect = [];
          });
        }
      });

    }, this.whisperConfig.scannerScanDurationMillis);




    setTimeout(() => { this.scan(); }, this.whisperConfig.scannerWaitDurationMillis);
  }

  onDeviceDiscovered(device) {
    console.log("Discovered " + JSON.stringify(device, null, 2));
    this.ngZone.run(() => {
      this.devices.push(device);
    });
  }

  async scanError(error) {
    this.setStatus("Error " + error);
    let toast = await this.toastCtrl.create({
      message: "Error scanning for Bluetooth low energy devices",
      position: "middle",
      duration: 5000
    });
    toast.present();
  }

  setStatus(message) {
    console.log(message);
    this.ngZone.run(() => {
      this.statusMessage = message;
    });
  }

  startAdvertisingSuccess(result) {
    console.log("startScanSuccess(" + result.status + ")");

  }

  startAdvertisingError(result) {
    console.log("startAdvertisingError(" + result.status + ")");

  }

  getLastKeyPair() {

    let keyPair = {
      pubKey: "",
      prvKey: ""
    };

    //keyPair = this.cryptoTools.generateKeyPair();
    console.log("keyPair to be fixed")
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
    this.currentPubKey = this.getLastKeyPair();
    if (result.status === "enabled") {
      console.log('#BLE-Status:', result.status + "-- Adding service")
      this.bluetoothle.addService(this.whisperConfig.serviceParam).then(serviceresult => {
        console.log('#BLE-addService' + JSON.stringify(serviceresult))
      });
    } else if (result.status === "readRequested") {
      console.log('#BLE-Status:', result.status + "-- Replying with pubkey")
      // -waiting for receiving a read request -> replying with pubkey
      var params = {
        "requestId": result.requestId + 1,
        "value": this.keyPair.pubKey //Read Hello World
      };
      this.bluetoothle.respond(params).then(respondresult => {
        console.log('#BLE-Reply' + JSON.stringify(respondresult))
      });;
    }
    else if (result.status === "writeRequested") {
      console.log('#BLE-Status:', result.status + "-- Reading his pubkey")
      // -waiting for receiving a write request -> read his pubkey
      /*
       {
          "status":"writeRequested",
          "address":"5163F1E0-5341-AF9B-9F67-613E15EC83F7",
          "service":"1234",
          "characteristic":"ABCD",
          "requestId":1, //This integer value will be incremented every read/writeRequested
          "value":"V3JpdGUgSGVsbG8gV29ybGQ=", //Write Hello World
          "offset":0
        }
      */
      //The "Write Response" contains only an error code indicating whether the write was successful or not.
      var paramswr = {
        "requestId": result.requestId + 1,
        "status": "connected",
        "value": this.keyPair.pubKey
      };
      //à revoir car ça risq d'envoyer un readRequest
      this.bluetoothle.respond(paramswr).then(respondresult => {
        console.log('#BLE-Reply' + JSON.stringify(respondresult))
      });
      if (this.debug)
        console.log("His public Key:" + result.value);
      var publicKey = result.value;
      var address = result.address;
      //diffie-hellman set data into ping, pear or connect
      this.process_diffie_hellman(this.keyPair, publicKey);

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

  servicesuccess(result) {



  }

  respondSuccess(result) {



  }


  // /**
  //  *
  //  * @param result
  //  * status => scanStarted = Scan has started
  //     status => scanResult = Scan has found a device
  //               name = the device's display name
  //               address = the device's address / identifier for connecting to the object
  //               rssi = signal strength
  //               advertisement = advertisement data in encoded string of bytes, use bluetoothle.encodedStringToBytes() (Android)
  //               advertisement = advertisement hash with the keys specified here (iOS)
  //               advertisement = empty (Windows)
  //  */
  scanResult(device: any) {
    /**
     * * recupé rer la priorité de l'autre device sur le manufacturerSpecificData à l'id nodleBluetoothManufacturerId
     * * si la priorité est inférieure à la mienne ou la ma clé à changer alors ajouter ce device à la list S_connect
     * * else ajouter à la liste S_pair
     * * mettre à jour la table whisperEvent
     * * keyPair = currentPubKey
     * * parcourir la liste S_pair et vérifier si la dernière date de connexion est inférieur à
     * * lastConnect != null && mustThrottle =now < lastConnect.connectTimeMillis + this.whisperConfig.mustReconnectAfterMillis
     * * si mustThrottle == true alors mettre à jour la table ping and delet from S_connect
     * * Pour chque elemt de S_connect
     * * * lire la public
     * * * send ma cle public
     * * * lancer getInteraction
     * * * mettre jour la table connect
     */

    console.log("scanResult: New Device:" + JSON.stringify(device))
    if (device.status === "scanResult") {

      let manufacturerData: any;

      if (typeof device.advertisement !== 'string') {
        //this.platform.is('ios')
        manufacturerData = this.bluetoothle.encodedStringToBytes(device.advertisement.manufacturerData)
      } else {
        manufacturerData = this.bluetoothle.encodedStringToBytes(device.advertisement)
      }

      console.log("manufacturerData: New Device:" + manufacturerData);
      var his_priority = (manufacturerData[7] << 8) + manufacturerData[8];
      console.log("His Prio: " + his_priority);
      let his_value = {
        "rssi": device.rssi,
        "name": device.name,
        "address": device.address,
        "priority": his_priority
      };
      let new_keyPair = this.getLastKeyPair();
      let now = new Date();
      if (his_value.priority < this.my_priority_int || new_keyPair != this.keyPair) {
        this.keyPair = new_keyPair;
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

  getLastConnect(address: string) {
    return -1;
  }
  addPing(petRowId, rssi, now, pingMaxElapsedTimeMillis) {

  }

  process_diffie_hellman(keyPair, publicKey) {
    let tokenPair = this.cryptoTools.getInteraction(keyPair, publicKey);
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

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}
