import { TestBed } from '@angular/core/testing';

import { PermissionBleService } from './permission-ble.service';

describe('PermissionBleService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PermissionBleService = TestBed.get(PermissionBleService);
    expect(service).toBeTruthy();
  });
});
