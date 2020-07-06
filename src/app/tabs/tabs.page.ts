import { Component } from '@angular/core';
import { BluetoothServiceService } from "../providers/bluetooth-service.service";
import { PermissionBleService } from "../service/permission-ble.service";

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {

  constructor(private bluetoothService: BluetoothServiceService,
    public permissionBleService: PermissionBleService) { }

  ngOnInit() {
    try {
      this.permissionBleService.requestBluetoothPermission();
      this.bluetoothService.startScan();

    } catch (error) {
      console.log('tracking or bluetooth not work', error);
    }

  }

  gotoGeolocalisation() {
    this.permissionBleService.requestBluetoothPermission();

  }

}
