import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoriasApi } from '../../core/api';
import { Confirmacao } from '../../core/confirmacao';
import type { Categoria } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { filtrosDaUrl } from '../../shared/formularios';
import { Ibox } from '../../shared/ibox';
import { IdiomasPreenchidos } from '../../shared/idiomas-preenchidos';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { SeletorCardapio } from '../../shared/seletor-cardapio';

@Component({
  selector: 'app-categorias-lista',
  imports: [RouterLink, Ibox, PaginaTitulo, SeletorCardapio, IdiomasPreenchidos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina-titulo
      titulo="Categorias"
      [trilha]="[{ rotulo: 'Cardápio' }, { rotulo: 'Categorias' }]"
    >
      <a
        [routerLink]="['/categorias', 'novo']"
        [queryParams]="{ menuId: filtros.menuId() }"
        class="btn btn-primary btn-sm"
      >
        <i class="fa-solid fa-plus"></i> Nova categoria
      </a>
    </app-pagina-titulo>

    <div class="wrapper wrapper-content">
      <app-ibox titulo="Categorias do cardápio" [semEspaco]="true">
        <div class="barra-lista">
          <div class="flex-grow-1">
            <app-seletor-cardapio nivel="menu" [(menuId)]="filtros.menuId" />
          </div>
          <input
            type="search"
            class="form-control busca"
            placeholder="Buscar..."
            aria-label="Buscar"
            (input)="busca.set($any($event.target).value)"
          />
        </div>
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Ordem</th>
                <th>Descrição</th>
                <th>Traduções</th>
                <th>Conteúdo</th>
                <th class="acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (c of filtradas(); track c.id) {
                <tr>
                  <td>
                    <span class="label">{{ c.ordem }}</span>
                  </td>
                  <td>
                    <a [routerLink]="['/categorias', c.id]" class="fw-semibold">{{
                      c.descricaoPT
                    }}</a>
                  </td>
                  <td><app-idiomas-preenchidos [entidade]="c" /></td>
                  <td>
                    <a
                      [routerLink]="['/subcategorias']"
                      [queryParams]="{ categoriaId: c.id, menuId: c.menuId }"
                      class="me-3"
                      >Subcategorias</a
                    >
                    <a
                      [routerLink]="['/itens']"
                      [queryParams]="{ categoriaId: c.id, menuId: c.menuId }"
                      >Itens</a
                    >
                  </td>
                  <td class="acoes">
                    <a [routerLink]="['/categorias', c.id]" class="btn btn-white btn-xs"
                      ><i class="fa-solid fa-pencil"></i> Editar</a
                    >
                    <button
                      type="button"
                      class="btn btn-white btn-xs ms-1 text-danger"
                      title="Excluir"
                      (click)="excluir(c)"
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="vazio">
                    @if (categorias.isLoading()) {
                      <i class="fa-solid fa-spinner fa-spin"></i> Carregando...
                    } @else {
                      <i class="fa-solid fa-layer-group"></i> Nenhuma categoria encontrada.
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
export class CategoriasLista {
  private readonly api = inject(CategoriasApi);
  private readonly confirmacao = inject(Confirmacao);
  private readonly notificacoes = inject(Notificacoes);

  protected readonly filtros = filtrosDaUrl(['menuId'] as const);
  protected readonly categorias = this.api.recursoLista(() => {
    const menuId = this.filtros.menuId();
    return menuId ? { menuId } : null;
  });
  protected readonly busca = signal('');
  protected readonly filtradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.categorias
      .value()
      .filter((c) => !termo || c.descricaoPT.toLowerCase().includes(termo));
  });

  protected async excluir(categoria: Categoria): Promise<void> {
    const ok = await this.confirmacao.perguntar(
      `Excluir a categoria "${categoria.descricaoPT}"? As subcategorias e itens dela também serão excluídos.`,
    );
    if (!ok) return;
    try {
      await this.api.remover(categoria.id);
      this.notificacoes.sucesso(`Categoria "${categoria.descricaoPT}" excluída.`);
      this.categorias.reload();
    } catch {
      // erro já exibido pelo interceptor
    }
  }
}
