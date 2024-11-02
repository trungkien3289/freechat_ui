import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { JwtModule } from '@auth0/angular-jwt';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { EnvService } from './services/env.service';
import { NZ_I18N } from 'ng-zorro-antd/i18n';
import { en_US } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

registerLocaleData(en);

export function tokenGetter() {
  return localStorage.getItem('token');
}

export function initializeApp(envService: EnvService) {
  return (): Promise<any> => {
    return envService
      .loadEnvConfig()
      .toPromise()
      .then((config) => {
        envService.setEnvConfig(config);
      });
  };
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FontAwesomeModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: ['localhost:5000'], // Add your server URL
        disallowedRoutes: ['http://localhost:5000/api/auth/'],
      },
    }),
    FormsModule,
    // NzNotificationModule,
  ],
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    EnvService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [EnvService],
      multi: true,
    },
    { provide: NZ_I18N, useValue: en_US },
    provideAnimationsAsync(),
    provideHttpClient(),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
