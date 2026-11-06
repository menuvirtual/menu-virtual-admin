import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItensApi, SubCategoriasApi } from '../../core/api';
import { Confirmacao } from '../../core/confirmacao';
import type { Item } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { filtrosDaUrl } from '../../shared/formularios';
import { Ibox } from '../../shared/ibox';
import { IdiomasPreenchidos } from '../../shared/idiomas-preenchidos';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { Paginacao, paginar } from '../../shared/paginacao';
import { SeletorCardapio } from '../../shared/seletor-cardapio';

@Component({
  selector: 'app-itens-lista',
  imports: [RouterLink, Ibox, PaginaTitulo, SeletorCardapio, IdiomasPreenchidos, Paginacao],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina-titulo titulo="Itens" [trilha]="[{ rotulo: 'Cardápio' }, { rotulo: 'Itens' }]">
      <a
        [routerLink]="['/itens', 'novo']"
        [queryParams]="{ subCategoriaId: filtros.subCategoriaId() }"
        class="btn btn-primary btn-sm"
      >
        <i class="fa-solid fa-plus"></i> Novo item
      </a>
    </app-pagina-titulo>

    <div class="wrapper wrapper-content">
      <app-ibox titulo="Itens do cardápio" [semEspaco]="true">
        <span ibox-titulo class="label label-primary">{{ filtrados().length }}</span>
        <div class="barra-lista">
          <div class="flex-grow-1">
            <app-seletor-cardapio
              nivel="subcategoria"
              [(menuId)]="filtros.menuId"
              [(categoriaId)]="filtros.categoriaId"
              [(subCategoriaId)]="filtros.subCategoriaId"
            />
          </div>
        </div>
        <div class="barra-lista">
          <input
            type="search"
            class="form-control busca"
            placeholder="Buscar pelo nome..."
            aria-label="Buscar"
            (input)="busca.set($any($event.target).value)"
          />
          <div class="form-check form-switch mb-1">
            <input
              id="soOcultos"
              class="form-check-input"
              type="checkbox"
              role="switch"
              [checked]="soOcultos()"
              (change)="soOcultos.set(!soOcultos())"
            />
            <label class="form-check-label" for="soOcultos">Só ocultos</label>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Ordem</th>
                <th>Item</th>
                <th>Traduções</th>
                <th>Subcategoria</th>
                <th>Tags</th>
                <th class="text-center">Visível</th>
                <th class="acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (i of pagina(); track i.id) {
                <tr [class.text-muted]="!i.visivel">
                  <td>
                    <span class="label">{{ i.ordem }}</span>
                  </td>
                  <td>
                    <a [routerLink]="['/itens', i.id]" class="fw-semibold">{{ i.nomePT }}</a>
                    @if (i.descricaoPT) {
                      <br /><small class="text-muted descricao">{{ i.descricaoPT }}</small>
                    }
                  </td>
                  <td><app-idiomas-preenchidos [entidade]="i" prefixo="nome" /></td>
                  <td>
                    {{ nomesSubs().get(i.subCategoriaId) ?? 'Subcategoria #' + i.subCategoriaId }}
                  </td>
                  <td>
                    @for (t of i.tags; track t.id) {
                      <span class="label label-info me-1">{{ t.descricaoPT }}</span>
                    }
                  </td>
                  <td class="text-center">
                    <button
                      type="button"
                      class="btn btn-xs"
                      [class]="i.visivel ? 'btn-primary' : 'btn-white'"
                      [title]="
                        i.visivel ? 'Visível: clique para ocultar' : 'Oculto: clique para exibir'
                      "
                      (click)="alternarVisivel(i)"
                    >
                      <i class="fa-solid" [class]="i.visivel ? 'fa-eye' : 'fa-eye-slash'"></i>
                    </button>
                  </td>
                  <td class="acoes">
                    <a [routerLink]="['/itens', i.id]" class="btn btn-white btn-xs"
                      ><i class="fa-solid fa-pencil"></i> Editar</a
                    >
                    <button
                      type="button"
                      class="btn btn-white btn-xs ms-1 text-danger"
                      title="Excluir"
                      (click)="excluir(i)"
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="vazio">
                    @if (itens.isLoading()) {
                      <i class="fa-solid fa-spinner fa-spin"></i> Carregando...
                    } @else {
                      <i class="fa-solid fa-utensils"></i> Nenhum item encontrado.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-paginacao [total]="filtrados().length" [(pagina)]="numeroPagina" />
      </app-ibox>
    </div>
  `,
  styles: `
    .descricao {
      display: inline-block;
      max-width: 420px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `,
})
export class ItensLista {
  private readonly api = inject(ItensApi);
  private readonly confirmacao = inject(Confirmacao);
  private readonly notificacoes = inject(Notificacoes);

  protected readonly filtros = filtrosDaUrl(['menuId', 'categoriaId', 'subCategoriaId'] as const);
  protected readonly itens = this.api.recursoLista(() => {
    const menuId = this.filtros.menuId();
    return menuId
      ? {
          menuId,
          categoriaId: this.filtros.categoriaId(),
          subCategoriaId: this.filtros.subCategoriaId(),
        }
      : null;
  });
  private readonly subs = inject(SubCategoriasApi).recursoLista(() => {
    const menuId = this.filtros.menuId();
    return menuId ? { menuId } : null;
  });
  protected readonly nomesSubs = computed(
    () => new Map(this.subs.value().map((s) => [s.id, s.descricaoPT])),
  );

  protected readonly busca = signal('');
  protected readonly soOcultos = signal(false);
  protected readonly numeroPagina = signal(1);
  protected readonly filtrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.itens
      .value()
      .filter((i) => !this.soOcultos() || !i.visivel)
      .filter((i) => !termo || i.nomePT.toLowerCase().includes(termo));
  });
  protected readonly pagina = computed(() => paginar(this.filtrados(), this.numeroPagina()));

  constructor() {
    // Volta para a primeira página quando os filtros mudam
    effect(() => {
      this.busca();
      this.soOcultos();
      this.filtros.menuId();
      this.filtros.categoriaId();
      this.filtros.subCategoriaId();
      this.numeroPagina.set(1);
    });
  }

  protected async alternarVisivel(item: Item): Promise<void> {
    try {
      const salvo = await this.api.atualizar(item.id, { visivel: !item.visivel });
      this.itens.update((lista) => lista.map((i) => (i.id === salvo.id ? salvo : i)));
      this.notificacoes.sucesso(
        `"${salvo.nomePT}" ${salvo.visivel ? 'visível' : 'oculto'} no cardápio.`,
      );
    } catch {
      // erro já exibido pelo interceptor
    }
  }

  protected async excluir(item: Item): Promise<void> {
    const ok = await this.confirmacao.perguntar(
      `Excluir o item "${item.nomePT}"? As mídias dele também serão excluídas.`,
    );
    if (!ok) return;
    try {
      await this.api.remover(item.id);
      this.notificacoes.sucesso(`Item "${item.nomePT}" excluído.`);
      this.itens.reload();
    } catch {
      // erro já exibido pelo interceptor
    }
  }
}
