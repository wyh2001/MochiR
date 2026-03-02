import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authRedirectInterceptor } from './core/interceptors/auth-redirect.interceptor';
import { apiResponseInterceptor } from './core/interceptors/api-response.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authRedirectInterceptor, apiResponseInterceptor, errorInterceptor]),
    ),
    provideAppInitializer(() => inject(AuthService).bootstrap()),
  ],
};
