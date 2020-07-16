import { Component } from '@angular/core';
import { DatabaseService } from '../service/database.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {

  tokens: any []= [];
  constructor(private db: DatabaseService) {}

  ngOnInit() {
    this.db.getDatabaseState().subscribe((res) => {
      if (res) {
        this.db.getPrivateEncounterTokens().subscribe(item => {
          console.log("Page1:" + JSON.stringify(item))
          if (item != null)
            this.tokens = item
        })
        
      }
    });
  }

  
  doRefresh() {
    console.log("doRefresh");
    this.db.getAllPrivateEncounterTokens();
  }

}
