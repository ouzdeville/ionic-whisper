import { Injectable } from '@angular/core';
import {AndroidPermissions} from "@ionic-native/android-permissions/ngx";
import { Diagnostic } from '@ionic-native/diagnostic/ngx';
import {BluetoothLE} from "@ionic-native/bluetooth-le/ngx";
import {AlertController, Platform} from "@ionic/angular";

@Injectable({
  providedIn: 'root'
})
export class PermissionBleService {

  constructor(public androidPermission: AndroidPermissions, public diagnostic: Diagnostic,
              public bluetoothLe: BluetoothLE, public platform: Platform, public alertController: AlertController) { }

  requestBluetoothPermission() {

    let returnValue: Promise<boolean> = new Promise(resolve => {

      if(this.platform.is('android')) {
        this.bluetoothLe.requestPermission().then(result => {
          console.log('[PermissionService] bluetooth has been enabled: ' + JSON.stringify(result));
          resolve(true);
        })
            .catch(error => {
              console.error('[PermissionService] error trying to enable bluetooth: ' + JSON.stringify(error));
              resolve(false);
            });
      }
      else if(this.platform.is('ios')) {
        this.diagnostic.requestBluetoothAuthorization().then(result => {
          console.log("[PermissionService] request bluetooth result: " + JSON.stringify(result));
          this.diagnostic.registerBluetoothStateChangeHandler(state => {
            if(state === this.diagnostic.bluetoothState.POWERED_ON){
              console.log('[PermissionService] bluetooth has been enabled: ' + JSON.stringify(state));
              console.log("Bluetooth is able to connect");
              resolve(true);
            }
            else {
              console.error('[PermissionService] bluetooth has noty been enabled: ' + JSON.stringify(state));
            }
          });
        })
            .catch(error => {
              console.error('[PermissionService] error trying to enable bluetooth: ' + JSON.stringify(error));
              resolve(false);
            });
      }

    });

    return returnValue;

  }
}
