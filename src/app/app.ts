import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmacaoModal } from './shared/confirmacao-modal';
import { NotificacoesView } from './shared/notificacoes-view';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificacoesView, ConfirmacaoModal],
  template: `
    <router-outlet />
    <app-notificacoes />
    <app-confirmacao-modal />
  `,
})
export class App {}
