import { Component, OnInit } from '@angular/core';
import { PermissionBleService } from '../service/permission-ble.service';
import {Router} from "@angular/router";
@Component({
  selector: 'app-permission',
  templateUrl: './permission.page.html',
  styleUrls: ['./permission.page.scss'],
})
export class PermissionPage implements OnInit {

  constructor(private permissionBleService: PermissionBleService, private router: Router) { }

  ngOnInit() {
  }
 gotoGeolocalisation() {
     this.router.navigateByUrl('/tab1');
    this.permissionBleService.requestBluetoothPermission().then((value) => {

    });

  }
}
