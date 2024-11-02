import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private activeTheme = localStorage.getItem('theme') || 'pink-theme';

  constructor() {
    this.updateTheme(this.activeTheme);
  }

  setGreenTheme() {
    this.updateTheme('green-theme');
  }

  setPinkTheme() {
    this.updateTheme('pink-theme');
  }

  toggleTheme() {
    if (this.activeTheme === 'pink-theme') {
      this.setGreenTheme();
    } else {
      this.setPinkTheme();
    }
  }

  getActiveTheme() {
    return this.activeTheme;
  }

  private updateTheme(theme: string) {
    document.body.classList.remove(this.activeTheme);
    document.body.classList.add(theme);
    this.activeTheme = theme;
    localStorage.setItem('theme', theme);
  }
}
