import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Notificacoes } from '../core/notificacoes';

const ICONES = {
  sucesso: 'fa-circle-check',
  erro: 'fa-circle-xmark',
  info: 'fa-circle-info',
  aviso: 'fa-triangle-exclamation',
} as const;

/** Exibe as notificações (canto superior direito, estilo toastr). */
@Component({
  selector: 'app-notificacoes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="notificacoes" aria-live="polite">
      @for (n of notificacoes.lista(); track n.id) {
        <div class="notificacao" [class]="n.tipo" role="alert" (click)="notificacoes.fechar(n.id)">
          <i class="fa-solid" [class]="icones[n.tipo]"></i>
          <div>
            <strong>{{ n.titulo }}</strong>
            <div>{{ n.mensagem }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .notificacoes {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 3000;
      width: 320px;
      max-width: calc(100vw - 24px);
    }
    .notificacao {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 15px 15px 15px 18px;
      margin-bottom: 8px;
      border-radius: 3px;
      color: #fff;
      box-shadow: 0 0 12px #999;
      opacity: 0.95;
      cursor: pointer;
      animation: entrar 0.25s ease-out;
      i {
        font-size: 22px;
        margin-top: 2px;
      }
      &:hover {
        opacity: 1;
        box-shadow: 0 0 12px #000;
      }
    }
    .sucesso {
      background: #1ab394;
    }
    .erro {
      background: #ed5565;
    }
    .info {
      background: #23c6c8;
    }
    .aviso {
      background: #f8ac59;
    }
    @keyframes entrar {
      from {
        transform: translateX(30px);
        opacity: 0;
      }
    }
  `,
})
export class NotificacoesView {
  protected readonly notificacoes = inject(Notificacoes);
  protected readonly icones = ICONES;
}
