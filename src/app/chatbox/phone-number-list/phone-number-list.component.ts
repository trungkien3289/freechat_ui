import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { PhoneNumber } from '../../models/phone-number.model';
import { FormControl } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  startWith,
} from 'rxjs';
import { ResourceService } from '../../services/resource.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-phone-number-list',
  templateUrl: './phone-number-list.component.html',
  styleUrl: './phone-number-list.component.scss',
})
export class PhoneNumberListComponent implements OnInit {
  @Input() userId: string = '';
  @Input() selectedPhoneNumberId?: string;
  @Input() phoneNumbers: PhoneNumber[] = [];
  // phoneNumbers: PhoneNumber[] = [];
  isLoading: boolean = false;
  searchControl = new FormControl();
  filteredPhones$: Observable<PhoneNumber[]> | undefined;
  // selectedItem: PhoneNumber | null = null;

  @Output() onSelectItem = new EventEmitter<PhoneNumber>();
  @Output() replacePhoneNumberSuccess = new EventEmitter<{
    oldPhoneId: string;
    newPhoneNumber: PhoneNumber;
  }>();

  constructor(
    private _ResourceService: ResourceService,
    private _NotificationService: NotificationService
  ) {}

  // ngOnChanges(changes: SimpleChanges) {
  //   if (
  //     changes['phoneNumbers'] &&
  //     changes['phoneNumbers'].currentValue !==
  //       changes['phoneNumbers'].previousValue
  //   ) {
  //     let foundContact = this.phoneNumbers.find(
  //       (c) => c.id === this.selectedPhoneNumberId
  //     );
  //     if (this.selectedPhoneNumberId == null || foundContact == null) {
  //       this.selectPhoneNumber(this.phoneNumbers[0]);
  //     } else {
  //       this.selectPhoneNumber(foundContact);
  //     }
  //   }
  // }

  ngOnInit(): void {
    this.filteredPhones$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map((searchTerm) => this.filterPhones(searchTerm))
    );
  }

  filterPhones = (searchTerm: number): PhoneNumber[] => {
    if (!searchTerm) return this.phoneNumbers;
    return this.phoneNumbers.filter((phone) =>
      phone.phoneNumber.includes(searchTerm.toString())
    );
  };

  selectPhoneNumber = (phoneNumberItem: PhoneNumber) => {
    if (!phoneNumberItem.unAuthorized) {
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
      this._NotificationService.error('Error replace phone number');
    }
  };

  public updateNewMessageComming = (
    phoneId: string,
    newMessageCount: number
  ) => {
    const phone = this.phoneNumbers.find((p) => p.id === phoneId);
    if (!phone) return;
    phone.newMessageCount = newMessageCount;
  };
}
