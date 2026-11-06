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
import { CategoriasApi } from '../../core/api';
import type { Categoria } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { CamposIdioma } from '../../shared/campos-idioma';
import { controlesIdioma, invalido, numeroOuNulo, valoresIdioma } from '../../shared/formularios';
import { Ibox } from '../../shared/ibox';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { SeletorCardapio } from '../../shared/seletor-cardapio';

@Component({
  selector: 'app-categoria-form',
  imports: [ReactiveFormsModule, RouterLink, Ibox, PaginaTitulo, SeletorCardapio, CamposIdioma],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina-titulo
      [titulo]="novo() ? 'Nova categoria' : 'Editar categoria'"
      [trilha]="[
        { rotulo: 'Cardápio' },
        { rotulo: 'Categorias', link: '/categorias' },
        { rotulo: novo() ? 'Nova' : (registro()?.descricaoPT ?? '...') },
      ]"
    >
      @if (registro(); as c) {
        <a
          [routerLink]="['/subcategorias']"
          [queryParams]="{ categoriaId: c.id, menuId: c.menuId }"
          class="btn btn-white btn-sm"
        >
          <i class="fa-regular fa-folder-open"></i> Subcategorias
        </a>
      }
    </app-pagina-titulo>

    <div class="wrapper wrapper-content">
      <form [formGroup]="form" (ngSubmit)="salvar()" novalidate>
        <div class="row">
          <div class="col-xl-8">
            <app-ibox titulo="Dados da categoria">
              <app-seletor-cardapio
                nivel="menu"
                modo="formulario"
                [invalido]="paiInvalido() && !menuId()"
                [(menuId)]="menuId"
                [(deOutroRestaurante)]="deOutroRestaurante"
              />
              @if (paiInvalido() && !menuId()) {
                <div class="text-danger small mt-1">Escolha o menu da categoria.</div>
              }
              <div class="row mt-3">
                <div class="col-sm-4 col-lg-3 mb-3">
                  <label class="form-label" for="ordem">Ordem</label>
                  <input
                    id="ordem"
                    type="number"
                    min="0"
                    class="form-control"
                    formControlName="ordem"
                    [class.is-invalid]="invalido(form.controls.ordem)"
                    placeholder="Fim da lista"
                  />
                  <div class="form-text">Vazio = depois da última.</div>
                </div>
              </div>
              <app-campos-idioma
                [grupo]="form"
                prefixo="descricao"
                rotulo="Descrição"
                [obrigatorioPT]="true"
              />
              <div ibox-rodape class="ibox-footer">
                <a
                  routerLink="/categorias"
                  [queryParams]="{ menuId: menuId() }"
                  class="btn btn-white btn-sm"
                  >Cancelar</a
                >
                <button
                  type="submit"
                  class="btn btn-primary btn-sm"
                  [disabled]="salvando() || deOutroRestaurante()"
                >
                  <i class="fa-solid" [class]="salvando() ? 'fa-spinner fa-spin' : 'fa-check'"></i>
                  Salvar
                </button>
              </div>
            </app-ibox>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class CategoriaForm {
  /** Parâmetro da rota: "novo" ou o id */
  readonly id = input.required<string>();

  private readonly api = inject(CategoriasApi);
  private readonly router = inject(Router);
  private readonly notificacoes = inject(Notificacoes);
  private readonly consulta = toSignal(inject(ActivatedRoute).queryParamMap);

  protected readonly novo = computed(() => this.id() === 'novo');
  protected readonly idNumero = computed(() => (this.novo() ? null : numeroOuNulo(this.id())));
  protected readonly registro = signal<Categoria | null>(null);
  protected readonly menuId = signal<number | null>(null);
  protected readonly paiInvalido = signal(false);
  protected readonly deOutroRestaurante = signal(false);
  protected readonly salvando = signal(false);
  protected readonly invalido = invalido;

  protected readonly form = new FormGroup({
    ordem: new FormControl<number | null>(null, [Validators.min(0)]),
    ...controlesIdioma('descricao', true),
  });

  constructor() {
    effect(() => {
      const id = this.idNumero();
      const menuDaUrl = numeroOuNulo(this.consulta()?.get('menuId'));
      untracked(() => {
        this.registro.set(null);
        this.form.reset();
        this.menuId.set(id ? null : menuDaUrl);
        if (id)
          this.api.obter(id).then(
            (c) => this.carregar(c),
            () => this.router.navigate(['/categorias']),
          );
      });
    });
  }

  protected async salvar(): Promise<void> {
    const menuId = this.menuId();
    this.paiInvalido.set(!menuId);
    if (this.deOutroRestaurante()) return;
    if (this.form.invalid || !menuId) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    try {
      const { ordem, ...textos } = this.form.getRawValue();
      const dados = { ...textos, menuId, ...(ordem === null ? {} : { ordem }) };
      const id = this.idNumero();
      const salva = id ? await this.api.atualizar(id, dados) : await this.api.criar(dados);
      this.notificacoes.sucesso(`Categoria "${salva.descricaoPT}" salva.`);
      if (!id) await this.router.navigate(['/categorias', salva.id]);
      else this.carregar(salva);
    } catch {
      // erro já exibido pelo interceptor
    } finally {
      this.salvando.set(false);
    }
  }

  private carregar(categoria: Categoria): void {
    this.registro.set(categoria);
    if (this.menuId() !== categoria.menuId) {
      this.menuId.set(categoria.menuId);
    }
    this.form.reset({ ordem: categoria.ordem, ...valoresIdioma('descricao', categoria) });
  }
}
