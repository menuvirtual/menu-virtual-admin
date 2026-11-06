import { Injectable, signal } from '@angular/core';

export type TipoNotificacao = 'sucesso' | 'erro' | 'info' | 'aviso';

export interface Notificacao {
  id: number;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
}

/** Notificações no canto da tela (estilo "toastr" do Inspinia). */
@Injectable({ providedIn: 'root' })
export class Notificacoes {
  private proximoId = 1;
  private readonly _lista = signal<Notificacao[]>([]);
  readonly lista = this._lista.asReadonly();

  sucesso(mensagem: string, titulo = 'Pronto') {
    this.mostrar('sucesso', titulo, mensagem);
  }

  erro(mensagem: string, titulo = 'Erro') {
    this.mostrar('erro', titulo, mensagem, 8000);
  }

  info(mensagem: string, titulo = 'Info') {
    this.mostrar('info', titulo, mensagem);
  }

  fechar(id: number) {
    this._lista.update((l) => l.filter((n) => n.id !== id));
  }

  private mostrar(tipo: TipoNotificacao, titulo: string, mensagem: string, duracao = 4000) {
    const id = this.proximoId++;
    this._lista.update((l) => [...l, { id, tipo, titulo, mensagem }]);
    setTimeout(() => this.fechar(id), duracao);
  }
}
