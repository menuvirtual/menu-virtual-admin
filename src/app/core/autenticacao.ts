import { HttpClient, HttpContext } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api-url';
import { SEM_NOTIFICACAO } from './interceptor-erros';
import type { Perfil } from './modelos';

/** Sessão do usuário (tokens do Cognito, obtidos pela API em /auth/...) */
export interface Sessao {
  accessToken: string;
  refreshToken: string;
  /** Validade do access token (epoch, em segundos) */
  expiraEm: number;
  usuario: string;
}

interface SessaoApi extends Omit<Sessao, 'refreshToken'> {
  refreshToken?: string;
}

/** Resultado do login: entrou, ou precisa definir a senha (primeiro acesso). */
export type ResultadoLogin = { tipo: 'ok' } | { tipo: 'nova-senha'; desafio: string };

const CHAVE = 'menuAdmin.sessao';

/**
 * Login e sessão. O admin fala só com a API (POST /auth/...), que chama o
 * Cognito (captcha temporariamente desativado). O access token vai em toda chamada ao /admin como
 * `Authorization: Bearer` (ver interceptor-auth.ts) e é renovado com o refresh token.
 *
 * A sessão fica no localStorage para sobreviver ao recarregar a página.
 */
@Injectable({ providedIn: 'root' })
export class Autenticacao {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${inject(API_URL)}/auth`;
  private readonly apiUrl = inject(API_URL);
  /** Erros destas chamadas são exibidos na própria tela de login, não como notificação */
  private readonly silencioso = { context: new HttpContext().set(SEM_NOTIFICACAO, true) };

  private readonly _sessao = signal<Sessao | null>(lerSessao());
  private readonly _perfil = signal<Perfil | null>(null);
  private renovando: Promise<boolean> | null = null;
  private carregandoPerfil: Promise<Perfil | null> | null = null;

  readonly sessao = this._sessao.asReadonly();
  readonly perfil = this._perfil.asReadonly();
  readonly logado = computed(() => !!this._sessao());
  readonly usuario = computed(() => this._sessao()?.usuario ?? '');
  readonly superUsuario = computed(() => !!this._perfil()?.superUsuario);
  /** Pode trocar de restaurante: superusuário ou quem administra mais de um */
  readonly podeTrocarRestaurante = computed(() => {
    const perfil = this._perfil();
    return !!perfil && (perfil.superUsuario || perfil.restaurantes.length > 1);
  });

  /** URL do desafio do captcha (widget ALTCHA) */
  // readonly urlCaptcha = `${this.base}/captcha`;

  async entrar(usuario: string, senha: string /*, captcha: string */): Promise<ResultadoLogin> {
    const resposta = await firstValueFrom(
      this.http.post<{ sessao?: Sessao; desafio?: string }>(
        `${this.base}/login`,
        { usuario, senha /*, captcha */ },
        this.silencioso,
      ),
    );
    if (resposta.desafio) return { tipo: 'nova-senha', desafio: resposta.desafio };
    this.iniciar(resposta.sessao!);
    return { tipo: 'ok' };
  }

  /** Primeiro acesso: troca a senha temporária e entra. */
  async definirNovaSenha(usuario: string, desafio: string, novaSenha: string): Promise<void> {
    this.iniciar(
      await firstValueFrom(
        this.http.post<Sessao>(
          `${this.base}/nova-senha`,
          { usuario, desafio, novaSenha },
          this.silencioso,
        ),
      ),
    );
  }

  esqueciSenha(usuario: string /*, captcha: string */): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/esqueci-senha`,
        { usuario /*, captcha */ },
        this.silencioso,
      ),
    );
  }

  redefinirSenha(usuario: string, codigo: string, novaSenha: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/redefinir-senha`,
        { usuario, codigo, novaSenha },
        this.silencioso,
      ),
    );
  }

  /**
   * Renova o access token com o refresh token. Chamadas simultâneas compartilham
   * a mesma renovação. false = não foi possível (a sessão é encerrada).
   */
  renovar(): Promise<boolean> {
    this.renovando ??= this.executarRenovacao().finally(() => (this.renovando = null));
    return this.renovando;
  }

  /** true se o access token vence em menos de 1 minuto */
  expirando(): boolean {
    const sessao = this._sessao();
    return !!sessao && sessao.expiraEm * 1000 - Date.now() < 60_000;
  }

  /** Carrega (ou recarrega) quem está logado e os restaurantes que ele administra. */
  async carregarPerfil(): Promise<Perfil> {
    const perfil = await firstValueFrom(this.http.get<Perfil>(`${this.apiUrl}/admin/eu`));
    this._perfil.set(perfil);
    return perfil;
  }

  /**
   * Perfil do usuário logado, carregado uma vez (chamadas simultâneas, como os
   * guards de uma rota, compartilham a mesma requisição). null = sem sessão ou falhou.
   */
  garantirPerfil(): Promise<Perfil | null> {
    const atual = this._perfil();
    if (atual) return Promise.resolve(atual);
    if (!this.logado()) return Promise.resolve(null);
    this.carregandoPerfil ??= this.carregarPerfil()
      .catch(() => null)
      .finally(() => (this.carregandoPerfil = null));
    return this.carregandoPerfil;
  }

  /** Encerra a sessão e volta para o login. */
  sair(motivo?: string): void {
    this._sessao.set(null);
    this._perfil.set(null);
    localStorage.removeItem(CHAVE);
    void this.router.navigate(['/login'], motivo ? { queryParams: { motivo } } : {});
  }

  private iniciar(sessao: SessaoApi): void {
    const atual = this._sessao();
    const nova: Sessao = {
      ...sessao,
      refreshToken: sessao.refreshToken ?? atual?.refreshToken ?? '',
    };
    this._sessao.set(nova);
    if (!atual || atual.usuario !== nova.usuario) this._perfil.set(null);
    localStorage.setItem(CHAVE, JSON.stringify(nova));
  }

  private async executarRenovacao(): Promise<boolean> {
    const sessao = this._sessao();
    if (!sessao?.refreshToken) return false;
    try {
      this.iniciar(
        await firstValueFrom(
          this.http.post<SessaoApi>(
            `${this.base}/renovar`,
            { usuario: sessao.usuario, refreshToken: sessao.refreshToken },
            this.silencioso,
          ),
        ),
      );
      return true;
    } catch {
      return false;
    }
  }
}

function lerSessao(): Sessao | null {
  try {
    const sessao = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Sessao | null;
    return sessao?.accessToken ? sessao : null;
  } catch {
    return null;
  }
}
