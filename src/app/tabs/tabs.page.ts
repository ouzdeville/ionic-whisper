import { Component } from '@angular/core';
import { BluetoothServiceService } from "../providers/bluetooth-service.service";
import { PermissionBleService } from "../service/permission-ble.service";
import { DatabaseService} from './../service/database.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {

  constructor(private bluetoothService: BluetoothServiceService,
    public permissionBleService: PermissionBleService, private db: DatabaseService) { }

  ngOnInit() {
    try {
      this.permissionBleService.requestBluetoothPermission();
      this.bluetoothService.startScan();

    } catch (error) {
      console.log('tracking or bluetooth not work', error);
    }

    try {
      this.db.getDatabaseState().subscribe(ready => {
        if (ready) {
          console.log("Database is ready !");
        }
      });
    } catch (error) {
        console.log('sqlite bd', error);
    }

  }

  gotoGeolocalisation() {
    this.permissionBleService.requestBluetoothPermission();

  }

}
