import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoriasApi, ItensApi, SubCategoriasApi } from '../../core/api';
import type { Item } from '../../core/modelos';
import { Ibox } from '../../shared/ibox';

/** Aba "Estrutura do cardápio": árvore Categoria > Subcategoria > Item do menu. */
@Component({
  selector: 'app-menu-estrutura',
  imports: [RouterLink, Ibox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ibox titulo="Categorias, subcategorias e itens" [semEspaco]="true">
      <a
        ibox-ferramentas
        [routerLink]="['/categorias', 'novo']"
        [queryParams]="{ menuId: menuId() }"
        class="btn btn-primary btn-xs text-white"
      >
        <i class="fa-solid fa-plus"></i> Nova categoria
      </a>
      @if (carregando()) {
        <div class="vazio"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</div>
      } @else {
        <ul class="arvore">
          @for (c of arvore(); track c.id) {
            <li class="categoria">
              <div class="linha">
                <button
                  type="button"
                  class="btn btn-link p-0 me-1"
                  [attr.aria-expanded]="!fechadas().has(c.id)"
                  (click)="alternar(c.id)"
                >
                  <i
                    class="fa-solid"
                    [class]="fechadas().has(c.id) ? 'fa-caret-right' : 'fa-caret-down'"
                  ></i>
                </button>
                <i class="fa-solid fa-folder text-navy me-2"></i>
                <strong>{{ c.ordem }}. {{ c.descricaoPT }}</strong>
                <span class="label ms-2">{{ c.subs.length }} subcat.</span>
                <span class="ms-auto acoes">
                  <a
                    [routerLink]="['/subcategorias', 'novo']"
                    [queryParams]="{ categoriaId: c.id }"
                    class="btn btn-white btn-xs"
                  >
                    <i class="fa-solid fa-plus"></i> Subcategoria
                  </a>
                  <a [routerLink]="['/categorias', c.id]" class="btn btn-white btn-xs"
                    ><i class="fa-solid fa-pencil"></i
                  ></a>
                </span>
              </div>
              @if (!fechadas().has(c.id)) {
                <ul>
                  @for (s of c.subs; track s.id) {
                    <li class="subcategoria">
                      <div class="linha">
                        <i class="fa-regular fa-folder-open text-muted me-2"></i>
                        {{ c.ordem }}.{{ s.ordem }} {{ s.descricaoPT }}
                        <span class="label ms-2">{{ s.itens.length }} itens</span>
                        <span class="ms-auto acoes">
                          <a
                            [routerLink]="['/itens', 'novo']"
                            [queryParams]="{ subCategoriaId: s.id }"
                            class="btn btn-white btn-xs"
                          >
                            <i class="fa-solid fa-plus"></i> Item
                          </a>
                          <a [routerLink]="['/subcategorias', s.id]" class="btn btn-white btn-xs"
                            ><i class="fa-solid fa-pencil"></i
                          ></a>
                        </span>
                      </div>
                      <ul>
                        @for (i of s.itens; track i.id) {
                          <li class="item">
                            <a [routerLink]="['/itens', i.id]" [class.text-muted]="!i.visivel">
                              <i class="fa-solid fa-utensils me-1"></i>{{ i.nomePT }}
                            </a>
                            @if (!i.visivel) {
                              <span class="label label-warning ms-1">oculto</span>
                            }
                            @for (t of i.tags; track t.id) {
                              <span class="label label-info ms-1">{{ t.descricaoPT }}</span>
                            }
                          </li>
                        }
                      </ul>
                    </li>
                  } @empty {
                    <li class="subcategoria text-muted">Nenhuma subcategoria.</li>
                  }
                </ul>
              }
            </li>
          } @empty {
            <li class="vazio">
              <i class="fa-solid fa-sitemap"></i> Este menu ainda não tem categorias.
            </li>
          }
        </ul>
      }
    </app-ibox>
  `,
  styles: `
    .arvore,
    .arvore ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .arvore ul {
      padding-left: 28px;
    }
    .linha {
      display: flex;
      align-items: center;
      padding: 8px 15px;
      border-top: 1px solid #e7eaec;
      gap: 2px;
    }
    .acoes {
      display: flex;
      gap: 4px;
    }
    .categoria > .linha {
      background: #fafafa;
    }
    .item {
      padding: 3px 15px 3px 30px;
    }
    .item:last-child {
      padding-bottom: 10px;
    }
  `,
})
export class MenuEstrutura {
  readonly menuId = input.required<number>();

  private readonly filtro = () => ({ menuId: this.menuId() });
  protected readonly categorias = inject(CategoriasApi).recursoLista(this.filtro);
  protected readonly subCategorias = inject(SubCategoriasApi).recursoLista(this.filtro);
  protected readonly itens = inject(ItensApi).recursoLista(this.filtro);

  protected readonly fechadas = signal(new Set<number>());
  protected readonly carregando = computed(
    () => this.categorias.isLoading() || this.subCategorias.isLoading() || this.itens.isLoading(),
  );

  protected readonly arvore = computed(() => {
    const itensPorSub = new Map<number, Item[]>();
    for (const item of this.itens.value())
      itensPorSub.set(item.subCategoriaId, [...(itensPorSub.get(item.subCategoriaId) ?? []), item]);
    return this.categorias.value().map((c) => ({
      ...c,
      subs: this.subCategorias
        .value()
        .filter((s) => s.categoriaId === c.id)
        .map((s) => ({ ...s, itens: itensPorSub.get(s.id) ?? [] })),
    }));
  });

  protected alternar(id: number): void {
    this.fechadas.update((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }
}
