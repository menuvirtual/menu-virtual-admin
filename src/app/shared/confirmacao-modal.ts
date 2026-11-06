import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Confirmacao } from '../core/confirmacao';

/** Janela modal de confirmação (estilo "inmodal" do Inspinia). */
@Component({
  selector: 'app-confirmacao-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'confirmacao.pedido()?.responder(false)' },
  template: `
    @if (confirmacao.pedido(); as pedido) {
      <div class="modal-backdrop fade show"></div>
      <div
        class="modal fade show d-block inmodal"
        role="dialog"
        aria-modal="true"
        (click)="pedido.responder(false)"
      >
        <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
          <div class="modal-content">
            <div class="modal-header">
              <i
                class="fa-solid modal-icone"
                [class]="pedido.perigo ? 'fa-triangle-exclamation' : 'fa-circle-question'"
              ></i>
              <h4 class="modal-title">{{ pedido.titulo }}</h4>
            </div>
            <div class="modal-body">
              <p class="mb-0">{{ pedido.mensagem }}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-white" (click)="pedido.responder(false)">
                Cancelar
              </button>
              <button
                type="button"
                class="btn"
                [class]="pedido.perigo ? 'btn-danger' : 'btn-primary'"
                (click)="pedido.responder(true)"
              >
                {{ pedido.confirmar }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .modal {
      z-index: 2100;
    }
    .modal-backdrop {
      z-index: 2050;
    }
    .modal-header {
      padding: 30px 15px 20px;
      display: block;
      text-align: center;
      border-bottom: 1px solid #e7eaec;
    }
    .modal-icone {
      font-size: 64px;
      color: #e2e3e3;
      display: block;
      margin-bottom: 10px;
    }
    .modal-title {
      font-size: 22px;
      font-weight: 300;
    }
    .modal-body {
      background: #f8fafb;
      text-align: center;
      padding: 20px 30px;
    }
  `,
})
export class ConfirmacaoModal {
  protected readonly confirmacao = inject(Confirmacao);
}
