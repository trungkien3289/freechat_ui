import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { PhoneNumber } from '../../models/phone-number.model';
import { FormControl } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  startWith,
} from 'rxjs';
import { ResourceService } from '../../services/resource.service';
import { NotificationService } from '../../services/notification.service';
import _ from 'lodash';

@Component({
  selector: 'app-phone-number-list',
  templateUrl: './phone-number-list.component.html',
  styleUrl: './phone-number-list.component.scss',
})
export class PhoneNumberListComponent implements OnInit {
  @Input() userId: string = '';
  @Input() selectedPhoneNumberId?: string;
  @Input() set phoneNumbers(value: PhoneNumber[]) {
    this.filteredPhones = this.filterPhones(value, this.searchControl.value);
    this._phoneNumbers = value;
  }

  @Input() isLoading: boolean = false;
  _phoneNumbers: PhoneNumber[] = [];
  searchControl = new FormControl();
  filteredPhones: PhoneNumber[] = [];

  @Output() onSelectItem = new EventEmitter<PhoneNumber>();
  @Output() replacePhoneNumberSuccess = new EventEmitter<{
    oldPhoneId: string;
    newPhoneNumber: PhoneNumber;
  }>();

  constructor(
    private _ResourceService: ResourceService,
    private _NotificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.filteredPhones = this.filterPhones(
      this._phoneNumbers,
      this.searchControl.value
    );
  }

  onFilterChange = (searchTerm: any) => {
    this.filteredPhones = this.filterPhones(this._phoneNumbers, searchTerm);
  };

  filterPhones = (phones: PhoneNumber[], searchTerm: number): PhoneNumber[] => {
    if (!searchTerm) return phones;
    return phones.filter((phone) =>
      phone.phoneNumber.includes(searchTerm.toString())
    );
  };

  selectPhoneNumber = (phoneNumberItem: PhoneNumber) => {
    if (!phoneNumberItem.expired) {
      this.onSelectItem.emit(phoneNumberItem);
    }
  };

  repacePhoneNumber = async (phoneNumber: PhoneNumber) => {
    try {
      const newPhoneNumber = await this._ResourceService.replacePhoneNumber(
        phoneNumber
      );
      this.replacePhoneNumberSuccess.emit({
        oldPhoneId: phoneNumber.id,
        newPhoneNumber,
      });
    } catch (ex) {
      if (_.isString(ex)) {
        this._NotificationService.error(ex);
      } else {
        this._NotificationService.error('Error replace phone number');
      }
    }
  };

  public updateNewMessageComming = (
    phoneId: string,
    newMessageCount: number
  ) => {
    const phone = this._phoneNumbers.find((p) => p.id === phoneId);
    if (!phone) return;
    phone.newMessageCount = newMessageCount;
  };
}
