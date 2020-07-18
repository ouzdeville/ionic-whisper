import { Component } from '@angular/core';
import { BluetoothServiceService } from "../providers/bluetooth-service.service";
import { PermissionBleService } from "../service/permission-ble.service";
import { DatabaseService} from './../service/database.service';
import {BackgroundMode} from "@ionic-native/background-mode/ngx";

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {

  
  constructor(private bluetoothService: BluetoothServiceService, public backgroundMode: BackgroundMode,
    public permissionBleService: PermissionBleService, private db: DatabaseService) { }

  ngOnInit() {
    try {
     

    } catch (error) {
      console.log('tracking or bluetooth not work', error);
    }

    try {
      this.backgroundMode.on('activate').subscribe(() => {
        setInterval(() => {
          console.log('background is running')
        },10000)
        this.db.getDatabaseState().subscribe(ready => {
          if (ready) {
            console.log("Database is ready !");
            this.permissionBleService.requestBluetoothPermission();
            this.bluetoothService.startTracking();
          }
        });
      })
      this.backgroundMode.enable()
    } catch (error) {
        console.log('sqlite bd', error);
    }

  }

  gotoGeolocalisation() {
    this.permissionBleService.requestBluetoothPermission();

  }
  
  
  

}
