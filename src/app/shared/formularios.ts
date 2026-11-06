import { effect, inject, linkedSignal, untracked, type WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IDIOMAS } from '../core/modelos';

/** Converte texto da URL em id (null se vazio/inválido). */
export function numeroOuNulo(valor: string | null | undefined): number | null {
  const n = Number(valor);
  return valor && Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Filtros numéricos (ids) guardados na query string da página: lê da URL e,
 * quando alterados, atualiza a URL (sem criar entrada no histórico).
 * Deve ser chamado no contexto de injeção (construtor/campo do componente).
 */
export function filtrosDaUrl<K extends string>(
  nomes: readonly K[],
): Record<K, WritableSignal<number | null>> {
  const rota = inject(ActivatedRoute);
  const router = inject(Router);
  const params = toSignal(rota.queryParamMap, { initialValue: rota.snapshot.queryParamMap });
  const filtros = Object.fromEntries(
    nomes.map((nome) => [nome, linkedSignal(() => numeroOuNulo(params().get(nome)))]),
  ) as Record<K, WritableSignal<number | null>>;

  effect(() => {
    const queryParams = Object.fromEntries(nomes.map((nome) => [nome, filtros[nome]()]));
    untracked(
      () =>
        void router.navigate([], {
          relativeTo: rota,
          queryParams,
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
    );
  });
  return filtros;
}

/** Controles <prefixo>PT ... <prefixo>DE de um campo traduzido. */
export function controlesIdioma(
  prefixo: string,
  obrigatorioPT: boolean,
): Record<string, FormControl<string>> {
  return Object.fromEntries(
    IDIOMAS.map((idioma) => [
      `${prefixo}${idioma}`,
      new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.maxLength(255),
          ...(idioma === 'PT' && obrigatorioPT ? [Validators.required, naoEmBranco] : []),
        ],
      }),
    ]),
  );
}

/** Valores de um campo traduzido vindos da API (null -> ''), para preencher o formulário. */
export function valoresIdioma(prefixo: string, entidade: object): Record<string, string> {
  const dados = entidade as Record<string, string | null | undefined>;
  return Object.fromEntries(
    IDIOMAS.map((idioma) => [`${prefixo}${idioma}`, dados[`${prefixo}${idioma}`] ?? '']),
  );
}

/** Validador: não aceita texto só com espaços. */
export function naoEmBranco(controle: AbstractControl): { emBranco: true } | null {
  const valor: unknown = controle.value;
  return typeof valor === 'string' && valor.length && !valor.trim() ? { emBranco: true } : null;
}

/** true quando o controle é inválido e o usuário já mexeu nele (ou tentou salvar). */
export function invalido(controle: AbstractControl | null): boolean {
  return !!controle && controle.invalid && (controle.touched || controle.dirty);
}

/** "Casa Lusitana!" -> "casa-lusitana" */
export function gerarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Formato aceito pela API para o slug do restaurante */
export const REGEX_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
