import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PermissionPage } from './permission.page';

describe('PermissionPage', () => {
  let component: PermissionPage;
  let fixture: ComponentFixture<PermissionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PermissionPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PermissionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
