import { Component } from '@angular/core';
import { DatabaseService } from '../service/database.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page {

  connects: any []= [];
  constructor(private db: DatabaseService) {}

  ngOnInit() {
    this.db.getDatabaseState().subscribe((res) => {
      if (res) {
        this.db.getConnectEvents().subscribe(item => {
          console.log("Connectons:" + JSON.stringify(item))
          if (item != null)
            this.connects = item
        })
        
      }
    });
  }

  
  doRefresh() {
    console.log("doRefresh");
    this.db.getAllBleConnectEvents();
  }

}
