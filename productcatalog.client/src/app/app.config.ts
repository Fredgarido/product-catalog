import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http'
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core'
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon'
import { provideRouter, withComponentInputBinding } from '@angular/router'
import { routes } from './app.routes'
import { retryInterceptor } from './core/interceptors/retry-interceptor'
import { HttpProductApi } from './core/services/http-product-api'
import { ProductApi } from './core/services/product-api'

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([retryInterceptor])),
    { provide: ProductApi, useClass: HttpProductApi },
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } },
  ],
}
