import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http'
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core'
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon'
import { provideRouter, withComponentInputBinding } from '@angular/router'
import { routes } from './app.routes'
import { retryInterceptor } from './core/interceptors/retry-interceptor'

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([retryInterceptor])),
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } },
  ],
}
