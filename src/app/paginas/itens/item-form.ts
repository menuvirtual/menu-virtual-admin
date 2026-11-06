import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ItensApi, TagsApi } from '../../core/api';
import type { Item } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { CamposIdioma } from '../../shared/campos-idioma';
import { controlesIdioma, invalido, numeroOuNulo, valoresIdioma } from '../../shared/formularios';
import { Ibox } from '../../shared/ibox';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { SeletorCardapio } from '../../shared/seletor-cardapio';
import { ItemMedias } from './item-medias';

@Component({
  selector: 'app-item-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Ibox,
    PaginaTitulo,
    SeletorCardapio,
    CamposIdioma,
    ItemMedias,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-form.html',
})
export class ItemForm {
  /** Parâmetro da rota: "novo" ou o id */
  readonly id = input.required<string>();

  private readonly api = inject(ItensApi);
  private readonly router = inject(Router);
  private readonly notificacoes = inject(Notificacoes);
  private readonly consulta = toSignal(inject(ActivatedRoute).queryParamMap);

  protected readonly novo = computed(() => this.id() === 'novo');
  protected readonly idNumero = computed(() => (this.novo() ? null : numeroOuNulo(this.id())));
  protected readonly registro = signal<Item | null>(null);
  protected readonly menuId = signal<number | null>(null);
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly subCategoriaId = signal<number | null>(null);
  protected readonly paiInvalido = signal(false);
  protected readonly deOutroRestaurante = signal(false);
  protected readonly salvando = signal(false);
  protected readonly invalido = invalido;

  /** Tags marcadas no item */
  protected readonly tagsMarcadas = signal(new Set<number>());
  protected readonly tags = inject(TagsApi).recursoLista();
  protected readonly tagsFiltro = computed(() => this.tags.value().filter((t) => t.visibleLista));
  protected readonly outrasTags = computed(() => this.tags.value().filter((t) => !t.visibleLista));

  protected readonly form = new FormGroup({
    ordem: new FormControl<number | null>(null, [Validators.min(0)]),
    visivel: new FormControl(true, { nonNullable: true }),
    ...controlesIdioma('nome', true),
    ...controlesIdioma('descricao', false),
  });

  constructor() {
    effect(() => {
      const id = this.idNumero();
      const subDaUrl = numeroOuNulo(this.consulta()?.get('subCategoriaId'));
      untracked(() => {
        this.registro.set(null);
        this.form.reset();
        this.tagsMarcadas.set(new Set());
        this.menuId.set(null);
        this.categoriaId.set(null);
        this.subCategoriaId.set(id ? null : subDaUrl);
        if (id)
          this.api.obter(id).then(
            (item) => this.carregar(item),
            () => this.router.navigate(['/itens']),
          );
      });
    });
  }

  protected alternarTag(id: number): void {
    this.tagsMarcadas.update((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  protected async salvar(): Promise<void> {
    const subCategoriaId = this.subCategoriaId();
    this.paiInvalido.set(!subCategoriaId);
    if (this.deOutroRestaurante()) return;
    if (this.form.invalid || !subCategoriaId) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    try {
      const { ordem, ...resto } = this.form.getRawValue();
      const dados = {
        ...resto,
        subCategoriaId,
        tagIds: [...this.tagsMarcadas()],
        ...(ordem === null ? {} : { ordem }),
      };
      const id = this.idNumero();
      const salvo = id ? await this.api.atualizar(id, dados) : await this.api.criar(dados);
      this.notificacoes.sucesso(`Item "${salvo.nomePT}" salvo.`);
      if (!id) await this.router.navigate(['/itens', salvo.id]);
      else this.carregar(salvo);
    } catch {
      // erro já exibido pelo interceptor
    } finally {
      this.salvando.set(false);
    }
  }

  private carregar(item: Item): void {
    this.registro.set(item);
    if (this.subCategoriaId() !== item.subCategoriaId) {
      this.menuId.set(null);
      this.categoriaId.set(null);
      this.subCategoriaId.set(item.subCategoriaId);
    }
    this.tagsMarcadas.set(new Set(item.tags.map((t) => t.id)));
    this.form.reset({
      ordem: item.ordem,
      visivel: item.visivel,
      ...valoresIdioma('nome', item),
      ...valoresIdioma('descricao', item),
    });
  }
}
