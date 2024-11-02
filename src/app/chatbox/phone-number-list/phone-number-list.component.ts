import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  phoneNumbers: PhoneNumber[] = [];
  isLoading: boolean = false;
  searchControl = new FormControl();
  filteredPhones$: Observable<PhoneNumber[]> | undefined;
  selectedItem: PhoneNumber | null = null;

  @Output() onSelectItem = new EventEmitter<PhoneNumber>();

  constructor(
    private _ResourceService: ResourceService,
    private _NotificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadPhoneNumbers();

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

  loadPhoneNumbers = async () => {
    this.isLoading = true;
    try {
      const items = await this._ResourceService.getPhoneNumbers(this.userId);
      this.phoneNumbers = items;

      // set the first item as selected
      if (items.length > 0) {
        this.selectPhoneNumber(items[0]);
      }
    } catch (error: any) {
      console.error(error);
      this._NotificationService.error(error);
    }

    this.isLoading = false;
  };

  selectPhoneNumber = (phoneNumberItem: PhoneNumber) => {
    this.selectedItem = phoneNumberItem;
    this.onSelectItem.emit(phoneNumberItem);
  };
}
