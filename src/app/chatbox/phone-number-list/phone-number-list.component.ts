import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { PhoneNumber } from '../../models/phone-number.model';
import { FormControl } from '@angular/forms';
import { ResourceService } from '../../services/resource.service';
import { NotificationService } from '../../services/notification.service';
import _ from 'lodash';

const COUNT_AVAILABLE_PHONE_INTERVAL = 20000;

@Component({
  selector: 'app-phone-number-list',
  templateUrl: './phone-number-list.component.html',
  styleUrl: './phone-number-list.component.scss',
})
export class PhoneNumberListComponent implements OnInit, OnDestroy {
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
  @Output() pickPhoneNumberSuccess = new EventEmitter<{
    oldPhoneId: string;
    newPhoneNumber: PhoneNumber;
  }>();

  @Output() pickAllPhoneSuccess = new EventEmitter();

  systemInfoInterval: any;
  availablePhoneCount: number = 0;
  remainReplaceNumberTimes: number = 40;

  constructor(
    private _ResourceService: ResourceService,
    private _NotificationService: NotificationService
  ) {}

  ngOnDestroy(): void {
    clearInterval(this.systemInfoInterval);
  }

  ngOnInit(): void {
    this.filteredPhones = this.filterPhones(
      this._phoneNumbers,
      this.searchControl.value
    );

    this.startFetchSystemInfoInterval();
    this.updateAvailablePhoneCount();
  }

  startFetchSystemInfoInterval = () => {
    this.systemInfoInterval = setInterval(async () => {
      this.updateAvailablePhoneCount();
    }, COUNT_AVAILABLE_PHONE_INTERVAL);
  };

  updateAvailablePhoneCount = async () => {
    const [availablePhoneCount, remainReplaceTimes] = await Promise.all([
      this._ResourceService.countAvailablePhoneNumbers(),
      this._ResourceService.countRemainReplaceTimes(),
    ]);
    this.availablePhoneCount = availablePhoneCount;
    this.remainReplaceNumberTimes = remainReplaceTimes;
  };

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
    if (
      !phoneNumberItem.expired &&
      // !phoneNumberItem.isError &&
      !phoneNumberItem.isEmpty
    ) {
      this.onSelectItem.emit(phoneNumberItem);
    }
  };

  repacePhoneNumber = async (phoneNumber: PhoneNumber) => {
    try {
      this.isLoading = true;
      const newPhoneNumber = await this._ResourceService.replacePhoneNumber(
        phoneNumber
      );
      await this.updateAvailablePhoneCount();
      this._NotificationService.success(
        `Replace phone number successfully, available phone in stock ${this.availablePhoneCount}`
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

    this.isLoading = false;
  };

  pickSinglePhoneNumber = async (phoneNumber: PhoneNumber) => {
    this.isLoading = true;
    try {
      const newPhoneNumber = await this._ResourceService.pickPhoneNumber(
        phoneNumber
      );
      await this.updateAvailablePhoneCount();
      this._NotificationService.success(
        `Pick phone number successfully, available phone in stock ${this.availablePhoneCount}`
      );
      this.pickPhoneNumberSuccess.emit({
        oldPhoneId: phoneNumber.id,
        newPhoneNumber,
      });
    } catch (ex) {
      if (_.isString(ex)) {
        this._NotificationService.error(ex);
      } else {
        this._NotificationService.error('Error pick phone number');
      }
    }

    this.isLoading = false;
  };

  pickPhoneNumber = async (phoneNumber: PhoneNumber) => {
    try {
      const newPhoneNumber = await this._ResourceService.pickPhoneNumber(
        phoneNumber
      );
    } catch (ex) {}
  };

  pickAll = async () => {
    this.isLoading = true;
    try {
      const emptyPhones = this._phoneNumbers.filter((p) => p.isEmpty);

      for (const phone of emptyPhones) {
        await this.pickPhoneNumber(phone);
      }

      await this.updateAvailablePhoneCount();
      this.pickAllPhoneSuccess.emit();
    } catch (ex) {}
    this.isLoading = false;
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
