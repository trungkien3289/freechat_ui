import { Injectable } from '@angular/core';
import { PhoneNumber } from '../models/phone-number.model';
import { ContactMessageGroup } from '../models/contact-message.model';

@Injectable({
  providedIn: 'root',
})
export class SelectedPhoneService {
  phoneNumber: PhoneNumber | null = null;
  contactMessageGroups: ContactMessageGroup[] = [];

  constructor() {}

  getNumberContact = (): number => {
    return this.contactMessageGroups.length;
  };

  setUsingPhoneNumber = (phoneNumber: PhoneNumber) => {
    this.phoneNumber = phoneNumber;
  };

  updateContactMessageGroups = (
    contactMessageGroups: ContactMessageGroup[]
  ) => {
    this.contactMessageGroups = contactMessageGroups;
  };

  reset = () => {
    this.phoneNumber = null;
    this.contactMessageGroups = [];
  };
}
