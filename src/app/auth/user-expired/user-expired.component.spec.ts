import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserExpiredComponent } from './user-expired.component';

describe('UserExpiredComponent', () => {
  let component: UserExpiredComponent;
  let fixture: ComponentFixture<UserExpiredComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserExpiredComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserExpiredComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
