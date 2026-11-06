import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoriasApi, SubCategoriasApi } from '../../core/api';
import { Confirmacao } from '../../core/confirmacao';
import type { SubCategoria } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { filtrosDaUrl } from '../../shared/formularios';
import { Ibox } from '../../shared/ibox';
import { IdiomasPreenchidos } from '../../shared/idiomas-preenchidos';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { SeletorCardapio } from '../../shared/seletor-cardapio';

@Component({
  selector: 'app-subcategorias-lista',
  imports: [RouterLink, Ibox, PaginaTitulo, SeletorCardapio, IdiomasPreenchidos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina-titulo
      titulo="Subcategorias"
      [trilha]="[{ rotulo: 'Cardápio' }, { rotulo: 'Subcategorias' }]"
    >
      <a
        [routerLink]="['/subcategorias', 'novo']"
        [queryParams]="{ categoriaId: filtros.categoriaId() }"
        class="btn btn-primary btn-sm"
      >
        <i class="fa-solid fa-plus"></i> Nova subcategoria
      </a>
    </app-pagina-titulo>

    <div class="wrapper wrapper-content">
      <app-ibox titulo="Subcategorias do cardápio" [semEspaco]="true">
        <div class="barra-lista">
          <div class="flex-grow-1">
            <app-seletor-cardapio
              nivel="categoria"
              [(menuId)]="filtros.menuId"
              [(categoriaId)]="filtros.categoriaId"
            />
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
                <th>Categoria</th>
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
                    <a [routerLink]="['/subcategorias', c.id]" class="fw-semibold">{{
                      c.descricaoPT
                    }}</a>
                  </td>
                  <td><app-idiomas-preenchidos [entidade]="c" /></td>
                  <td>
                    <a [routerLink]="['/categorias', c.categoriaId]">{{
                      nomesCategorias().get(c.categoriaId) ?? 'Categoria #' + c.categoriaId
                    }}</a>
                  </td>
                  <td>
                    <a
                      [routerLink]="['/itens']"
                      [queryParams]="{ subCategoriaId: c.id }"
                      class="me-3"
                      >Itens</a
                    >
                    <a [routerLink]="['/itens', 'novo']" [queryParams]="{ subCategoriaId: c.id }"
                      ><i class="fa-solid fa-plus"></i> Item</a
                    >
                  </td>
                  <td class="acoes">
                    <a [routerLink]="['/subcategorias', c.id]" class="btn btn-white btn-xs"
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
                  <td colspan="6" class="vazio">
                    @if (subCategorias.isLoading()) {
                      <i class="fa-solid fa-spinner fa-spin"></i> Carregando...
                    } @else {
                      <i class="fa-regular fa-folder-open"></i> Nenhuma subcategoria encontrada.
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
export class SubCategoriasLista {
  private readonly api = inject(SubCategoriasApi);
  private readonly confirmacao = inject(Confirmacao);
  private readonly notificacoes = inject(Notificacoes);

  protected readonly filtros = filtrosDaUrl(['menuId', 'categoriaId'] as const);
  protected readonly subCategorias = this.api.recursoLista(() => {
    const menuId = this.filtros.menuId();
    return menuId ? { menuId, categoriaId: this.filtros.categoriaId() } : null;
  });
  /** Nomes das categorias do menu escolhido (coluna "Categoria") */
  private readonly categorias = inject(CategoriasApi).recursoLista(() => {
    const menuId = this.filtros.menuId();
    return menuId ? { menuId } : null;
  });
  protected readonly nomesCategorias = computed(
    () => new Map(this.categorias.value().map((c) => [c.id, c.descricaoPT])),
  );
  protected readonly busca = signal('');
  protected readonly filtradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.subCategorias
      .value()
      .filter((c) => !termo || c.descricaoPT.toLowerCase().includes(termo));
  });

  protected async excluir(sub: SubCategoria): Promise<void> {
    const ok = await this.confirmacao.perguntar(
      `Excluir a subcategoria "${sub.descricaoPT}"? Os itens dela também serão excluídos.`,
    );
    if (!ok) return;
    try {
      await this.api.remover(sub.id);
      this.notificacoes.sucesso(`Subcategoria "${sub.descricaoPT}" excluída.`);
      this.subCategorias.reload();
    } catch {
      // erro já exibido pelo interceptor
    }
  }
}
