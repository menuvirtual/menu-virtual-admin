import { HttpContextToken, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Notificacoes } from './notificacoes';

/** Extrai a mensagem de erro da resposta da API (Nest: { message: string | string[] }). */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpErrorResponse) {
    if (erro.status === 0)
      return 'Não foi possível conectar à API. Verifique se o BackEnd está rodando.';
    const corpo = erro.error as { message?: string | string[] } | null;
    const mensagem = corpo?.message;
    if (Array.isArray(mensagem)) return mensagem.join(' ');
    if (mensagem) return mensagem;
    return `Erro ${erro.status} ao acessar a API.`;
  }
  return erro instanceof Error ? erro.message : 'Erro inesperado.';
}

/** Marca uma requisição cujo erro não deve virar notificação (quem chamou trata). */
export const SEM_NOTIFICACAO = new HttpContextToken(() => false);

/** Mostra uma notificação para qualquer erro de HTTP e repassa o erro adiante. */
export const interceptorErros: HttpInterceptorFn = (req, next) => {
  const notificacoes = inject(Notificacoes);
  return next(req).pipe(
    catchError((erro: unknown) => {
      if (!req.context.get(SEM_NOTIFICACAO)) notificacoes.erro(mensagemDeErro(erro));
      return throwError(() => erro);
    }),
  );
};
