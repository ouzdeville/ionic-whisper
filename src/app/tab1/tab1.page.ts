import { Component } from '@angular/core';
import { PermissionBleService } from '../service/permission-ble.service';
import { DatabaseService } from '../service/database.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  keyPairs: any []= [];
  constructor(private permissionBleService: PermissionBleService,
    private db: DatabaseService) { }

  ngOnInit() {
    this.db.getDatabaseState().subscribe((res) => {
      if (res) {
        this.db.getUserKeyPairs().subscribe(item => {
          console.log("KeyPairs:" + JSON.stringify(item))
          if (item != null)
            this.keyPairs = item
        })
        
      }
    });
  }

  gotoGeolocalisation() {
    this.permissionBleService.requestBluetoothPermission();

  }
  doRefresh() {
    console.log("doRefresh");
    this.db.getAllUserKeyPairs();
  }



}
