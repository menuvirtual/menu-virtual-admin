import { computed, inject, Injectable, signal } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Autenticacao } from './autenticacao';
import type { Restaurante } from './modelos';

/**
 * Restaurante que o usuário está administrando. Todas as telas do admin
 * trabalham dentro dele.
 *
 * - Quem administra um só restaurante entra direto nele (sem tela de seleção).
 * - Quem administra vários, e o superusuário (que acessa todos), escolhe em
 *   /selecionar-restaurante a cada login; a escolha fica lembrada no navegador
 *   (por usuário) para recarregar a página sem escolher de novo.
 */
@Injectable({ providedIn: 'root' })
export class RestauranteAtual {
  private readonly auth = inject(Autenticacao);
  /** Escolha feita, com o usuário que a fez (outro usuário logado não a herda) */
  private readonly escolha = signal<{ usuario: string; restaurante: Restaurante } | null>(null);

  readonly restaurante = computed(() => {
    const escolha = this.escolha();
    return escolha && escolha.usuario === this.auth.usuario() ? escolha.restaurante : null;
  });
  readonly id = computed(() => this.restaurante()?.id ?? null);

  selecionar(restaurante: Restaurante): void {
    this.escolha.set({ usuario: this.auth.usuario(), restaurante });
    localStorage.setItem(this.chave(), String(restaurante.id));
  }

  /** Atualiza os dados exibidos (ex.: depois de editar o nome) */
  atualizar(restaurante: Restaurante): void {
    if (restaurante.id === this.id()) this.selecionar(restaurante);
  }

  /** Esquece a escolha (ex.: ao fazer login, para quem tem vários restaurantes escolher de novo). */
  limpar(): void {
    this.escolha.set(null);
    localStorage.removeItem(this.chave());
  }

  /**
   * Define o restaurante a partir do perfil: o já escolhido (se o usuário ainda
   * tem acesso), o lembrado no navegador, ou o único que ele administra.
   * false = o usuário precisa escolher.
   */
  definirPeloPerfil(): boolean {
    const perfil = this.auth.perfil();
    if (!perfil) return false;
    const permitidos = perfil.restaurantes;
    const atual = this.restaurante();
    const lembrado = Number(localStorage.getItem(this.chave()));
    const escolhido =
      (atual && permitidos.some((r) => r.id === atual.id) ? atual : undefined) ??
      permitidos.find((r) => r.id === lembrado) ??
      (!perfil.superUsuario && permitidos.length === 1 ? permitidos[0] : undefined);
    if (escolhido) this.selecionar(escolhido);
    else this.escolha.set(null);
    return !!escolhido;
  }

  private chave(): string {
    return `menuAdmin.restauranteId.${this.auth.usuario().toLowerCase()}`;
  }
}

/** Exige sessão aberta (senão vai para o login) e carrega o perfil do usuário. */
export const exigeLogin: CanActivateFn = async (_rota, estado) => {
  const auth = inject(Autenticacao);
  const router = inject(Router);
  if (!auth.logado())
    return router.createUrlTree(['/login'], {
      queryParams: estado.url && estado.url !== '/' ? { retorno: estado.url } : {},
    });
  // sem perfil: 401 sem renovação possível (o interceptor já encerrou a sessão)
  return !!(await auth.garantirPerfil()) || router.createUrlTree(['/login']);
};

/**
 * Telas do admin: exigem um restaurante definido (ver RestauranteAtual).
 * Os guards de uma rota rodam em paralelo, por isso cada um espera o perfil.
 */
export const exigeRestaurante: CanActivateFn = async () => {
  const atual = inject(RestauranteAtual);
  const router = inject(Router);
  if (!(await inject(Autenticacao).garantirPerfil())) return false; // exigeLogin redireciona
  return atual.definirPeloPerfil() || router.createUrlTree(['/selecionar-restaurante']);
};

/** A tela de seleção só aparece para quem pode trocar de restaurante. */
export const podeSelecionarRestaurante: CanActivateFn = async () => {
  const router = inject(Router);
  const perfil = await inject(Autenticacao).garantirPerfil();
  if (!perfil) return false; // exigeLogin redireciona
  const unicoRestaurante = !perfil.superUsuario && perfil.restaurantes.length === 1;
  return !unicoRestaurante || router.createUrlTree(['/']);
};

/** Telas só de superusuário (ex.: editar tags, que valem para todos os restaurantes). */
export const exigeSuperUsuario: CanActivateFn = async () => {
  // inject() só funciona antes do primeiro await
  const router = inject(Router);
  const perfil = await inject(Autenticacao).garantirPerfil();
  return !!perfil?.superUsuario || router.createUrlTree(['/tags']);
};
