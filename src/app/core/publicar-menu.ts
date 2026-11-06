import { inject, Injectable } from '@angular/core';
import { MenusApi } from './api';
import { Confirmacao } from './confirmacao';
import type { Menu } from './modelos';
import { Notificacoes } from './notificacoes';

/** "Publicar" um menu (preview -> versão publicada), com confirmação e aviso. */
@Injectable({ providedIn: 'root' })
export class PublicarMenu {
  private readonly api = inject(MenusApi);
  private readonly confirmacao = inject(Confirmacao);
  private readonly notificacoes = inject(Notificacoes);

  /** Devolve o menu atualizado, ou null se o usuário cancelou ou a API recusou. */
  async publicar(menu: Pick<Menu, 'id' | 'nome' | 'isAtivo'>): Promise<Menu | null> {
    const efeito = menu.isAtivo
      ? 'O cardápio público já passa a mostrar as mudanças.'
      : 'Este menu não está ativo: o cardápio público só muda quando ele for ativado.';
    const ok = await this.confirmacao.perguntar(
      `Publicar as atualizações de "${menu.nome}"? A versão de preview vira a versão publicada. ${efeito}`,
      { titulo: 'Publicar menu', confirmar: 'Sim, publicar', perigo: false },
    );
    if (!ok) return null;
    try {
      const publicado = await this.api.publicar(menu.id);
      this.notificacoes.sucesso(`"${menu.nome}" publicado.`);
      return publicado;
    } catch {
      return null; // erro já exibido pelo interceptor
    }
  }
}
