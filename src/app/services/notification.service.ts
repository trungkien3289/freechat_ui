import { Injectable } from '@angular/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';

enum NotificationType {
  ERROR = 'error',
  SUCCESS = 'success',
  WARNING = 'warning',
  INFO = 'info',
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private _NzNotificationService: NzNotificationService) {}
  error = (message: string) => {
    this._NzNotificationService.create(
      NotificationType.ERROR,
      'Error',
      message
    );
  };

  success = (message: string) => {
    this._NzNotificationService.create(
      NotificationType.SUCCESS,
      'Success',
      message
    );
  };

  warning = (message: string) => {
    this._NzNotificationService.create(
      NotificationType.WARNING,
      'Warning',
      message
    );
  };

  info = (message: string) => {
    this._NzNotificationService.create(NotificationType.INFO, 'Info', message);
  };
}
