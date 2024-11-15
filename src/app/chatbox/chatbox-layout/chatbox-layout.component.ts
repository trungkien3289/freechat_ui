import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import {
  faSignOutAlt,
  faChartLine,
  faClipboardQuestion,
} from '@fortawesome/free-solid-svg-icons';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-chatbox-layout',
  templateUrl: './chatbox-layout.component.html',
  styleUrl: './chatbox-layout.component.scss',
})
export class ChatboxLayoutComponent {
  username: string = '';
  faSignOutAlt = faSignOutAlt;
  faClipboardQuestion = faClipboardQuestion;
  faChartLine = faChartLine;
  toogleConfig = {
    color: {
      checked: '#40a578',
      unchecked: '#f19d9d',
    },
    switchColor: {
      checked: '##fff',
      unchecked: '##fff',
    },
    labels: {
      unchecked: 'Pink',
      checked: 'Green',
    },
    value: false,
  };
  constructor(
    private _Router: Router,
    private _UserService: UserService,
    private _ThemeService: ThemeService
  ) {
    this.username = this._UserService.getUsername() || '';
    this.toogleConfig.value =
      this._ThemeService.getActiveTheme() === 'pink-theme';
  }

  logout = () => {
    localStorage.removeItem('token');
    this._Router.navigate(['/auth/login']);
  };

  // changeTheme = () => {
  //   this._ThemeService.toggleTheme();
  // };
}
