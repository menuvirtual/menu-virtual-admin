import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  untracked,
} from '@angular/core';
import { CategoriasApi, MenusApi, SubCategoriasApi } from '../core/api';
import { rotuloMenu } from '../core/modelos';
import { RestauranteAtual } from '../core/restaurante-atual';

export type NivelCardapio = 'menu' | 'categoria' | 'subcategoria';
const ORDEM: NivelCardapio[] = ['menu', 'categoria', 'subcategoria'];

/**
 * Seleção em cascata Menu > Categoria > Subcategoria (até o `nivel`), sempre
 * dentro do restaurante que está sendo administrado. Trocar um nível limpa os de
 * baixo. Sem menu escolhido, usa o menu ativo do restaurante. Se vier só um id
 * mais profundo (ex.: editar um item), os níveis de cima são descobertos pela API.
 *
 * - modo "filtro": categoria e subcategoria têm a opção "Todas".
 * - modo "formulario": "Selecione..." e o último nível marcado como obrigatório.
 */
@Component({
  selector: 'app-seletor-cardapio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row g-2">
      <div [class]="coluna()">
        <label class="form-label" for="sel-menu">Menu</label>
        <select
          id="sel-menu"
          class="form-select"
          [disabled]="travado()"
          [class.is-invalid]="invalido() && nivel() === 'menu'"
          (change)="trocar('menu', $event)"
        >
          @if (!menuId()) {
            <option value="">{{ menus.isLoading() ? 'Carregando...' : 'Selecione...' }}</option>
          }
          @for (m of menus.value(); track m.id) {
            <option [value]="m.id" [selected]="m.id === menuId()">{{ rotulo(m) }}</option>
          }
        </select>
      </div>
      @if (mostra('categoria')) {
        <div [class]="coluna()">
          <label class="form-label" for="sel-categoria">Categoria</label>
          <select
            id="sel-categoria"
            class="form-select"
            [disabled]="travado() || !menuId()"
            [class.is-invalid]="invalido() && nivel() === 'categoria'"
            (change)="trocar('categoria', $event)"
          >
            <option value="">{{ vazio() }}</option>
            @for (c of categorias.value(); track c.id) {
              <option [value]="c.id" [selected]="c.id === categoriaId()">
                {{ c.ordem }}. {{ c.descricaoPT }}
              </option>
            }
          </select>
        </div>
      }
      @if (mostra('subcategoria')) {
        <div [class]="coluna()">
          <label class="form-label" for="sel-subcategoria">Subcategoria</label>
          <select
            id="sel-subcategoria"
            class="form-select"
            [disabled]="travado() || !categoriaId()"
            [class.is-invalid]="invalido() && nivel() === 'subcategoria'"
            (change)="trocar('subcategoria', $event)"
          >
            <option value="">{{ categoriaId() ? vazio() : 'Escolha a categoria' }}</option>
            @for (s of subCategorias.value(); track s.id) {
              <option [value]="s.id" [selected]="s.id === subCategoriaId()">
                {{ s.ordem }}. {{ s.descricaoPT }}
              </option>
            }
          </select>
        </div>
      }
    </div>
    @if (deOutroRestaurante()) {
      <div class="alert alert-warning mt-2 mb-0 py-2">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Este registro pertence a outro restaurante. Troque de restaurante para editá-lo.
      </div>
    }
  `,
})
export class SeletorCardapio {
  readonly nivel = input.required<NivelCardapio>();
  readonly modo = input<'filtro' | 'formulario'>('filtro');
  /** Impede trocar a seleção */
  readonly travado = input(false);
  /** Marca o último nível como inválido (formulário) */
  readonly invalido = input(false);

  readonly menuId = model<number | null>(null);
  readonly categoriaId = model<number | null>(null);
  readonly subCategoriaId = model<number | null>(null);
  /** Saída: true quando o registro escolhido é de outro restaurante (o formulário não deve salvar) */
  readonly deOutroRestaurante = model(false);

  private readonly restauranteId = inject(RestauranteAtual).id;
  private readonly categoriasApi = inject(CategoriasApi);
  private readonly subCategoriasApi = inject(SubCategoriasApi);

  protected readonly menus = inject(MenusApi).recursoLista(() => {
    const restauranteId = this.restauranteId();
    return restauranteId ? { restauranteId } : null;
  });
  protected readonly categorias = this.categoriasApi.recursoLista(() => {
    const menuId = this.menuId();
    return this.mostra('categoria') && menuId ? { menuId } : null;
  });
  protected readonly subCategorias = this.subCategoriasApi.recursoLista(() => {
    const categoriaId = this.categoriaId();
    return this.mostra('subcategoria') && categoriaId ? { categoriaId } : null;
  });

  /** O menu escolhido não é do restaurante atual (ex.: link de outro restaurante) */
  private readonly menuDeOutroRestaurante = computed(() => {
    const menuId = this.menuId();
    return (
      !!menuId &&
      !this.menus.isLoading() &&
      this.menus.hasValue() &&
      !this.menus.value().some((m) => m.id === menuId)
    );
  });

  protected readonly rotulo = rotuloMenu;

  constructor() {
    effect(() => this.deOutroRestaurante.set(this.menuDeOutroRestaurante()));
    // Sem nada escolhido: começa pelo menu ativo (ou o primeiro) do restaurante
    effect(() => {
      const menus = this.menus.value();
      if (this.menuId() || this.categoriaId() || this.subCategoriaId() || !menus.length) return;
      const padrao = menus.find((m) => m.isAtivo) ?? menus[0];
      untracked(() => this.menuId.set(padrao.id));
    });
    // Descobre os níveis de cima a partir do id mais profundo informado
    effect(() => {
      const sub = this.subCategoriaId();
      if (sub && !this.categoriaId())
        untracked(() =>
          this.subCategoriasApi.obter(sub).then((s) => this.categoriaId.set(s.categoriaId)),
        );
    });
    effect(() => {
      const categoria = this.categoriaId();
      if (categoria && !this.menuId())
        untracked(() => this.categoriasApi.obter(categoria).then((c) => this.menuId.set(c.menuId)));
    });
  }

  protected mostra(nivel: NivelCardapio): boolean {
    return ORDEM.indexOf(nivel) <= ORDEM.indexOf(this.nivel());
  }

  protected vazio(): string {
    return this.modo() === 'filtro' ? 'Todas' : 'Selecione...';
  }

  protected coluna(): string {
    const colunas = ORDEM.indexOf(this.nivel()) + 1;
    if (colunas === 3) return 'col-md-4';
    if (colunas === 2) return 'col-md-6';
    return this.modo() === 'formulario' ? 'col-12' : 'col-md-6 col-lg-4';
  }

  protected trocar(nivel: NivelCardapio, evento: Event): void {
    const valor = Number((evento.target as HTMLSelectElement).value) || null;
    if (nivel === 'menu') {
      this.menuId.set(valor);
      this.categoriaId.set(null);
      this.subCategoriaId.set(null);
    }
    if (nivel === 'categoria') {
      this.categoriaId.set(valor);
      this.subCategoriaId.set(null);
    }
    if (nivel === 'subcategoria') this.subCategoriaId.set(valor);
  }
}
