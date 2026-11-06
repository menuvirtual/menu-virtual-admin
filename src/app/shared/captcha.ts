// Captcha temporariamente desativado; implementação preservada para retomada.
// import 'altcha';
// import 'altcha/i18n/pt-br';
// import {
//   ChangeDetectionStrategy,
//   Component,
//   CUSTOM_ELEMENTS_SCHEMA,
//   ElementRef,
//   input,
//   output,
//   viewChild,
// } from '@angular/core';
//
// interface EventoAltcha {
//   detail: { state: string; payload?: string };
// }
//
// /**
//  * Captcha "Não sou um robô" (ALTCHA, prova de trabalho; o desafio vem da API em
//  * GET /auth/captcha e é conferido por ela no login). Emite a resposta (base64)
//  * quando verificado e null quando volta a ficar pendente.
//  *
//  * Cada resposta só vale uma vez: depois de uma tentativa, chame reiniciar().
//  */
// @Component({
//   selector: 'app-captcha',
//   schemas: [CUSTOM_ELEMENTS_SCHEMA],
//   changeDetection: ChangeDetectionStrategy.OnPush,
//   template: `
//     <altcha-widget
//       #widget
//       [attr.challenge]="urlDesafio()"
//       language="pt-br"
//       hidelogo
//       (statechange)="aoMudar($any($event))"
//     ></altcha-widget>
//   `,
//   styles: `
//     :host {
//       display: block;
//       --altcha-max-width: 100%;
//       --altcha-border-color: #e5e6e7;
//       --altcha-border-radius: 1px;
//       --altcha-color-base: #fff;
//       --altcha-color-base-content: #676a6c;
//       --altcha-color-primary: #1ab394;
//       --altcha-color-success: #1ab394;
//       --altcha-color-error: #ed5565;
//       --altcha-checkbox-border-radius: 3px;
//     }
//     :host(.invalido) {
//       --altcha-border-color: #ed5565;
//     }
//   `,
// })
// export class Captcha {
//   readonly urlDesafio = input.required<string>();
//   readonly resposta = output<string | null>();
//
//   private readonly widget =
//     viewChild.required<ElementRef<HTMLElement & { reset?: () => void }>>('widget');
//
//   protected aoMudar(evento: EventoAltcha): void {
//     const { state, payload } = evento.detail;
//     this.resposta.emit(state === 'verified' && payload ? payload : null);
//   }
//
//   /** Volta ao estado inicial (o usuário marca de novo e recebe um desafio novo). */
//   reiniciar(): void {
//     this.widget().nativeElement.reset?.();
//     this.resposta.emit(null);
//   }
// }
//

export {};
