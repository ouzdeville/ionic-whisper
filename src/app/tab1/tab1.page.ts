import { Component } from '@angular/core';
import { PermissionBleService } from '../service/permission-ble.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  constructor(private permissionBleService: PermissionBleService) {}

  gotoGeolocalisation() {
    this.permissionBleService.requestBluetoothPermission();

  }

}
