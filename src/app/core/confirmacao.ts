import { Injectable, signal } from '@angular/core';

export interface PedidoConfirmacao {
  titulo: string;
  mensagem: string;
  /** Texto do botão de confirmar */
  confirmar: string;
  perigo: boolean;
  responder: (ok: boolean) => void;
}

/** Janela de confirmação (ex.: antes de excluir). */
@Injectable({ providedIn: 'root' })
export class Confirmacao {
  private readonly _pedido = signal<PedidoConfirmacao | null>(null);
  readonly pedido = this._pedido.asReadonly();

  perguntar(
    mensagem: string,
    { titulo = 'Tem certeza?', confirmar = 'Sim, excluir', perigo = true } = {},
  ): Promise<boolean> {
    this._pedido()?.responder(false);
    return new Promise((resolve) =>
      this._pedido.set({
        titulo,
        mensagem,
        confirmar,
        perigo,
        responder: (ok) => {
          this._pedido.set(null);
          resolve(ok);
        },
      }),
    );
  }
}
