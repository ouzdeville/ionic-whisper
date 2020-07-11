import { Component } from '@angular/core';
import { DatabaseService } from '../service/database.service';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss']
})
export class Tab4Page {

  pings: any []= [];
  constructor(private db: DatabaseService) {}

  ngOnInit() {
    this.db.getDatabaseState().subscribe((res) => {
      if (res) {
        this.db.getPingEvents().subscribe(item => {
          console.log("Pings:" + JSON.stringify(item))
          if (item != null)
            this.pings = item
        })
        
      }
    });
  }

  
  doRefresh() {
    console.log("doRefresh");
    this.db.getAllBlePingEvents();
  }

}
