import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface PassoTrilha {
  rotulo: string;
  link?: string | unknown[];
}

/**
 * Cabeçalho da página (page-heading do Inspinia): título, trilha (breadcrumb)
 * e, à direita, os botões projetados.
 */
@Component({
  selector: 'app-pagina-titulo',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-heading">
      <div>
        <h2>{{ titulo() }}</h2>
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/">Início</a></li>
          @for (passo of trilha(); track $index; let ultimo = $last) {
            <li class="breadcrumb-item" [class.active]="ultimo">
              @if (passo.link && !ultimo) {
                <a [routerLink]="passo.link">{{ passo.rotulo }}</a>
              } @else {
                {{ passo.rotulo }}
              }
            </li>
          }
        </ol>
      </div>
      <div class="acoes"><ng-content /></div>
    </div>
  `,
})
export class PaginaTitulo {
  readonly titulo = input.required<string>();
  readonly trilha = input<PassoTrilha[]>([]);
}
