import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { PhoneNumber } from '../../models/phone-number.model';
import {
  ContactMessage,
  ContactMessageGroup,
} from '../../models/contact-message.model';
import { first, last } from 'lodash';

@Component({
  selector: 'app-contact-list',
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss',
})
export class ContactListComponent {
  @Input() phoneNumber?: PhoneNumber;
  @Input() selectedContactId?: string;
  @Input() contactMessageGroups: ContactMessageGroup[] = [];
  @Output() onSelectItem = new EventEmitter<ContactMessageGroup>();
  @Output() onNewGroupConversation = new EventEmitter<void>();
  isLoading: boolean = false;
  selectedContact?: ContactMessageGroup;
  _last = last;
  _first = first;

  constructor() {}

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['contactMessageGroups'] &&
      changes['contactMessageGroups'].currentValue !==
        changes['contactMessageGroups'].previousValue
    ) {
      let foundContact = this.contactMessageGroups.find(
        (c) => c.id === this.selectedContactId
      );
      if (this.selectedContactId == null || foundContact == null) {
        this.selectItem(this.contactMessageGroups[0]);
      } else {
        this.selectItem(foundContact);
      }
    }
  }

  selectItem = (item: ContactMessageGroup) => {
    this.selectedContact = item;
    this.onSelectItem.emit(item);
  };

  newConversation = () => {
    this.onNewGroupConversation.emit();
  };

  public updateNewMessageComming = (updateDic: {
    [key: string]: { newMessageCount: number; newMessages: ContactMessage[] };
  }) => {
    Object.keys(updateDic).forEach((groupId) => {
      const group = this.contactMessageGroups.find((g) => g.id === groupId);
      if (!group) return;
      group.newMessageCount = updateDic[groupId].newMessageCount || 0;
      // if (
      //   updateDic[groupId].newMessages &&
      //   updateDic[groupId].newMessages.length > 0
      // ) {
      //   group.messages = group.messages.concat(updateDic[groupId].newMessages);
      // }
    });
  };
}
