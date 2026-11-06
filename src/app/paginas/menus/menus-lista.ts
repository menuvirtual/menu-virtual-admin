import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenusApi } from '../../core/api';
import { API_URL } from '../../core/api-url';
import { Confirmacao } from '../../core/confirmacao';
import type { Menu } from '../../core/modelos';
import { PublicarMenu } from '../../core/publicar-menu';
import { Notificacoes } from '../../core/notificacoes';
import { Ibox } from '../../shared/ibox';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { RestauranteAtual } from '../../core/restaurante-atual';
import { SituacaoMenu } from '../../shared/situacao-menu';

@Component({
  selector: 'app-menus-lista',
  imports: [RouterLink, Ibox, PaginaTitulo, SituacaoMenu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina-titulo titulo="Menus" [trilha]="[{ rotulo: 'Menus' }]">
      <a [routerLink]="['/menus', 'novo']" class="btn btn-primary btn-sm">
        <i class="fa-solid fa-plus"></i> Novo menu
      </a>
    </app-pagina-titulo>

    <div class="wrapper wrapper-content">
      <app-ibox titulo="Versões do cardápio deste restaurante" [semEspaco]="true">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Menu</th>
                <th>Situação</th>
                <th>Atualizações</th>
                <th>Cardápio</th>
                <th class="acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (m of menus.value(); track m.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/menus', m.id]" class="fw-semibold">{{ m.nome }}</a>
                  </td>
                  <td><app-situacao-menu [menu]="m" /></td>
                  <td>
                    @if (m.contemAtualizacaoParaPublicar) {
                      <span
                        class="label label-warning"
                        title="O preview tem mudanças que ainda não foram publicadas"
                      >
                        <i class="fa-solid fa-clock"></i> Para publicar
                      </span>
                    } @else {
                      <span class="label" title="O preview e a versão publicada são iguais">
                        Em dia
                      </span>
                    }
                  </td>
                  <td>
                    <a [routerLink]="['/categorias']" [queryParams]="{ menuId: m.id }" class="me-3">
                      <i class="fa-solid fa-layer-group"></i> Categorias
                    </a>
                    <a [routerLink]="['/itens']" [queryParams]="{ menuId: m.id }" class="me-3">
                      <i class="fa-solid fa-utensils"></i> Itens
                    </a>
                    @if (m.isAtivo) {
                      <a
                        [href]="urlPublica(m, false)"
                        target="_blank"
                        rel="noopener"
                        title="JSON publicado (GET /menu)"
                        class="me-3"
                      >
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> JSON
                      </a>
                      <a
                        [href]="urlPublica(m, true)"
                        target="_blank"
                        rel="noopener"
                        title="JSON de pré-visualização (GET /menu?preview=true)"
                      >
                        <i class="fa-solid fa-eye"></i> Preview
                      </a>
                    }
                  </td>
                  <td class="acoes">
                    @if (m.contemAtualizacaoParaPublicar) {
                      <button
                        type="button"
                        class="btn btn-primary btn-xs me-1"
                        title="Copia o preview para a versão publicada"
                        (click)="publicar(m)"
                      >
                        <i class="fa-solid fa-upload"></i> Publicar
                      </button>
                    }
                    @if (!m.isAtivo) {
                      <button
                        type="button"
                        class="btn btn-white btn-xs me-1"
                        title="Torna este o menu ativo do restaurante"
                        (click)="ativar(m)"
                      >
                        <i class="fa-solid fa-circle-check"></i> Ativar
                      </button>
                    }
                    <a [routerLink]="['/menus', m.id]" class="btn btn-white btn-xs">
                      <i class="fa-solid fa-pencil"></i> Editar
                    </a>
                    <button
                      type="button"
                      class="btn btn-white btn-xs ms-1 text-danger"
                      title="Excluir"
                      (click)="excluir(m)"
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="vazio">
                    @if (menus.isLoading()) {
                      <i class="fa-solid fa-spinner fa-spin"></i> Carregando...
                    } @else {
                      <i class="fa-solid fa-book-open"></i> Nenhum menu encontrado.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-ibox>
    </div>
  `,
})
export class MenusLista {
  private readonly api = inject(MenusApi);
  private readonly apiUrl = inject(API_URL);
  private readonly confirmacao = inject(Confirmacao);
  private readonly notificacoes = inject(Notificacoes);
  private readonly publicacao = inject(PublicarMenu);

  private readonly restauranteId = inject(RestauranteAtual).id;
  protected readonly menus = this.api.recursoLista(() => ({
    restauranteId: this.restauranteId(),
  }));

  /** Endereço público do menu ativo (versão publicada ou de preview) */
  protected urlPublica(m: Menu, preview: boolean): string {
    return `${this.apiUrl}/menu?restaurante=${m.restaurante?.slug}${preview ? '&preview=true' : ''}`;
  }

  protected async publicar(menu: Menu): Promise<void> {
    if (await this.publicacao.publicar(menu)) this.menus.reload();
  }

  protected async ativar(menu: Menu): Promise<void> {
    const ok = await this.confirmacao.perguntar(
      `Tornar "${menu.nome}" o menu ativo? O menu ativo atual do restaurante será desativado.`,
      { titulo: 'Ativar menu', confirmar: 'Sim, ativar', perigo: false },
    );
    if (!ok) return;
    try {
      await this.api.atualizar(menu.id, { isAtivo: true });
      this.notificacoes.sucesso(`"${menu.nome}" ativado.`);
      this.menus.reload();
    } catch {
      // erro já exibido pelo interceptor
    }
  }

  protected async excluir(menu: Menu): Promise<void> {
    const ok = await this.confirmacao.perguntar(
      `Excluir o menu "${menu.nome}"? A configuração, as categorias, subcategorias, itens e mídias dele também serão excluídos.`,
    );
    if (!ok) return;
    try {
      await this.api.remover(menu.id);
      this.notificacoes.sucesso(`"${menu.nome}" excluído.`);
      this.menus.reload();
    } catch {
      // erro já exibido pelo interceptor
    }
  }
}
