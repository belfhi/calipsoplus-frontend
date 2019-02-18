import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectCalipsoQuotaFormComponent } from './select-calipso-quota-form.component';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {NO_ERRORS_SCHEMA} from '@angular/core';

describe('SelectCalipsoQuotaFormComponent', () => {
  let component: SelectCalipsoQuotaFormComponent;
  let fixture: ComponentFixture<SelectCalipsoQuotaFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectCalipsoQuotaFormComponent ],
      imports: [HttpClientTestingModule, RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectCalipsoQuotaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
