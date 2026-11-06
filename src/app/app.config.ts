import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { routes } from './app.routes';
import { interceptorAuth } from './core/interceptor-auth';
import { interceptorErros } from './core/interceptor-erros';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // interceptorErros por fora: só notifica o que o interceptorAuth não resolveu (ex.: 401 renovado)
    provideHttpClient(withFetch(), withInterceptors([interceptorErros, interceptorAuth])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
