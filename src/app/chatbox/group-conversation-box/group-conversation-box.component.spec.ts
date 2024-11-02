import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupConversationBoxComponent } from './group-conversation-box.component';

describe('GroupConversationBoxComponent', () => {
  let component: GroupConversationBoxComponent;
  let fixture: ComponentFixture<GroupConversationBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GroupConversationBoxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupConversationBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
