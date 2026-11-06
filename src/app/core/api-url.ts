import { InjectionToken } from '@angular/core';

/**
 * Endereço da Menu API (BackEnd). Para apontar para outro servidor, troque o
 * valor padrão abaixo ou forneça API_URL em app.config.ts.
 */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:3000',
});
