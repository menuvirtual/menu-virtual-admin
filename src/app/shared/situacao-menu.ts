import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { situacaoMenu, type Menu } from '../core/modelos';

/** Rótulo colorido com a situação do menu: Ativo / Inativo. */
@Component({
  selector: 'app-situacao-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="label" [class]="classe()">{{ texto() }}</span>`,
})
export class SituacaoMenu {
  readonly menu = input.required<Pick<Menu, 'isAtivo'>>();

  protected readonly texto = computed(() => situacaoMenu(this.menu()));
  protected readonly classe = computed(() => (this.menu().isAtivo ? 'label-primary' : ''));
}
