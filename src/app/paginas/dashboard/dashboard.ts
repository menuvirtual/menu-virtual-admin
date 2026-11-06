import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenusApi, ResumoApi } from '../../core/api';
import { API_URL } from '../../core/api-url';
import { RestauranteAtual } from '../../core/restaurante-atual';
import { Ibox } from '../../shared/ibox';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { SituacaoMenu } from '../../shared/situacao-menu';

/** Dashboard do restaurante que está sendo administrado. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Ibox, PaginaTitulo, SituacaoMenu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly atual = inject(RestauranteAtual);
  protected readonly restaurante = this.atual.restaurante;
  protected readonly apiUrl = inject(API_URL);

  protected readonly resumo = inject(ResumoApi).recurso(this.atual.id);
  protected readonly menus = inject(MenusApi).recursoLista(() => ({
    restauranteId: this.atual.id(),
  }));
  protected readonly menuAtivo = computed(() => this.menus.value().find((m) => m.isAtivo));

  protected urlPublica(preview: boolean): string {
    return `${this.apiUrl}/menu?restaurante=${this.restaurante()?.slug}${preview ? '&preview=true' : ''}`;
  }

  protected atualizar(): void {
    this.resumo.reload();
    this.menus.reload();
  }
}
