import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { PhoneNumber } from '../../models/phone-number.model';
import { ContactMessageGroup } from '../../models/contact-message.model';
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
    console.log('contact group selected', item);
    this.selectedContact = item;
    this.onSelectItem.emit(item);
  };

  newConversation = () => {
    this.onNewGroupConversation.emit();
  };
}
