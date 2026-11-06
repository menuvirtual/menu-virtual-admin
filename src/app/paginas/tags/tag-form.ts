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
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TagsApi } from '../../core/api';
import type { Tag } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { CamposIdioma } from '../../shared/campos-idioma';
import { controlesIdioma, numeroOuNulo, valoresIdioma } from '../../shared/formularios';
import { Ibox } from '../../shared/ibox';
import { PaginaTitulo } from '../../shared/pagina-titulo';

@Component({
  selector: 'app-tag-form',
  imports: [ReactiveFormsModule, RouterLink, Ibox, PaginaTitulo, CamposIdioma],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina-titulo
      [titulo]="novo() ? 'Nova tag' : 'Editar tag'"
      [trilha]="[
        { rotulo: 'Tags', link: '/tags' },
        { rotulo: novo() ? 'Nova' : (registro()?.descricaoPT ?? '...') },
      ]"
    />
    <div class="wrapper wrapper-content">
      <div class="row">
        <div class="col-xl-7">
          <form [formGroup]="form" (ngSubmit)="salvar()" novalidate>
            <app-ibox titulo="Dados da tag">
              <div class="mb-3">
                <app-campos-idioma
                  [grupo]="form"
                  prefixo="descricao"
                  rotulo="Descrição"
                  [obrigatorioPT]="true"
                />
              </div>
              <div class="form-check form-switch">
                <input
                  id="visibleLista"
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                  formControlName="visibleLista"
                />
                <label class="form-check-label" for="visibleLista"
                  >Exibir na lista de filtros do cardápio</label
                >
              </div>
              <div class="form-text">
                Ex.: "Vegano" e "Sem glúten" ficam visíveis para o cliente filtrar os itens.
              </div>
              <div ibox-rodape class="ibox-footer">
                <a routerLink="/tags" class="btn btn-white btn-sm">Cancelar</a>
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="salvando()">
                  <i class="fa-solid" [class]="salvando() ? 'fa-spinner fa-spin' : 'fa-check'"></i>
                  Salvar
                </button>
              </div>
            </app-ibox>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class TagForm {
  /** Parâmetro da rota: "novo" ou o id */
  readonly id = input.required<string>();

  private readonly api = inject(TagsApi);
  private readonly router = inject(Router);
  private readonly notificacoes = inject(Notificacoes);

  protected readonly novo = computed(() => this.id() === 'novo');
  protected readonly idNumero = computed(() => (this.novo() ? null : numeroOuNulo(this.id())));
  protected readonly registro = signal<Tag | null>(null);
  protected readonly salvando = signal(false);

  protected readonly form = new FormGroup({
    visibleLista: new FormControl(true, { nonNullable: true }),
    ...controlesIdioma('descricao', true),
  });

  constructor() {
    effect(() => {
      const id = this.idNumero();
      untracked(() => {
        this.registro.set(null);
        this.form.reset();
        if (id)
          this.api.obter(id).then(
            (t) => this.carregar(t),
            () => this.router.navigate(['/tags']),
          );
      });
    });
  }

  protected async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    try {
      const dados = this.form.getRawValue();
      const id = this.idNumero();
      const salva = id ? await this.api.atualizar(id, dados) : await this.api.criar(dados);
      this.notificacoes.sucesso(`Tag "${salva.descricaoPT}" salva.`);
      if (!id) await this.router.navigate(['/tags', salva.id]);
      else this.carregar(salva);
    } catch {
      // erro já exibido pelo interceptor
    } finally {
      this.salvando.set(false);
    }
  }

  private carregar(tag: Tag): void {
    this.registro.set(tag);
    this.form.reset({ visibleLista: tag.visibleLista, ...valoresIdioma('descricao', tag) });
  }
}
