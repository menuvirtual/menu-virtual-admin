import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

/**
 * Painel "ibox" do Inspinia: título com ferramentas à direita (recolher) e conteúdo.
 * Use o atributo `ibox-ferramentas` para projetar botões no título e
 * `ibox-rodape` para o rodapé.
 */
@Component({
  selector: 'app-ibox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ibox">
      <div class="ibox-title">
        <h5>{{ titulo() }}</h5>
        <ng-content select="[ibox-titulo]" />
        <div class="ibox-tools">
          <ng-content select="[ibox-ferramentas]" />
          <a
            role="button"
            [attr.aria-label]="recolhido() ? 'Expandir' : 'Recolher'"
            (click)="recolhido.set(!recolhido())"
          >
            <i class="fa-solid" [class]="recolhido() ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
          </a>
        </div>
      </div>
      @if (!recolhido()) {
        <div class="ibox-content" [class.no-padding]="semEspaco()">
          <ng-content />
        </div>
        <ng-content select="[ibox-rodape]" />
      }
    </div>
  `,
})
export class Ibox {
  readonly titulo = input('');
  /** Conteúdo sem padding (ex.: tabelas) */
  readonly semEspaco = input(false);
  protected readonly recolhido = signal(false);
}
