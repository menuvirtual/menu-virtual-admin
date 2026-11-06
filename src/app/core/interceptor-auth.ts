import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_URL } from './api-url';
import { Autenticacao } from './autenticacao';

/**
 * Coloca `Authorization: Bearer <access token>` nas chamadas à API (exceto /auth/...).
 * Renova o token antes de vencer e, se a API responder 401, tenta renovar uma vez e
 * repetir a chamada; sem sucesso, encerra a sessão e volta para o login.
 */
export const interceptorAuth: HttpInterceptorFn = (req, next) => {
  const auth = inject(Autenticacao);
  const apiUrl = inject(API_URL);
  if (!req.url.startsWith(apiUrl) || req.url.startsWith(`${apiUrl}/auth/`) || !auth.logado())
    return next(req);

  const comToken = (r: HttpRequest<unknown>) =>
    r.clone({ setHeaders: { Authorization: `Bearer ${auth.sessao()!.accessToken}` } });

  const enviar = () =>
    next(comToken(req)).pipe(
      catchError((erro: unknown) => {
        if (!(erro instanceof HttpErrorResponse) || erro.status !== 401)
          return throwError(() => erro);
        return from(auth.renovar()).pipe(
          switchMap((renovou) => {
            if (!renovou) {
              auth.sair('expirada');
              return throwError(() => erro);
            }
            return next(comToken(req));
          }),
        );
      }),
    );

  return auth.expirando() ? from(auth.renovar()).pipe(switchMap(() => enviar())) : enviar();
};
