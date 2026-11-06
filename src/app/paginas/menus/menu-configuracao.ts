import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ConfiguracoesMenuApi } from '../../core/api';
import { IDIOMAS, NOMES_IDIOMAS, type ConfiguracaoMenu } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { Ibox } from '../../shared/ibox';

const booleano = (valor = false) => new FormControl(valor, { nonNullable: true });

const CAMPOS_PESQUISA = [
  { campo: 'habilitaPesquisaClienteNome', rotulo: 'Nome', icone: 'fa-user' },
  {
    campo: 'habilitaPesquisaClienteDataNiver',
    rotulo: 'Data de aniversário',
    icone: 'fa-cake-candles',
  },
  { campo: 'habilitaPesquisaClienteEmail', rotulo: 'E-mail', icone: 'fa-envelope' },
  { campo: 'habilitaPesquisaClientePhone', rotulo: 'Telefone', icone: 'fa-phone' },
] as const;

/** Aba "Configuração" do menu (ConfiguracaoMenu, 1:1 com o menu). */
@Component({
  selector: 'app-menu-configuracao',
  imports: [ReactiveFormsModule, Ibox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="salvar()">
      @if (!carregando() && !configuracao()) {
        <div class="alert alert-warning mb-0 rounded-0">
          <i class="fa-solid fa-circle-info"></i>
          Este menu ainda não tem configuração. Ajuste as opções e salve para criá-la.
        </div>
      }
      <div class="row">
        <div class="col-md-6">
          <app-ibox titulo="Idiomas do cardápio">
            @for (idioma of idiomas; track idioma) {
              <div class="form-check form-switch mb-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                  [id]="'habilita' + idioma"
                  [formControlName]="'habilita' + idioma"
                />
                <label class="form-check-label" [for]="'habilita' + idioma">
                  <strong>{{ idioma }}</strong> · {{ nomes[idioma] }}
                </label>
              </div>
            }
          </app-ibox>
        </div>
        <div class="col-md-6">
          <app-ibox titulo="Pesquisa / cadastro do cliente">
            <div class="form-check form-switch mb-3">
              <input
                class="form-check-input"
                type="checkbox"
                role="switch"
                id="habilitaPesquisaCliente"
                formControlName="habilitaPesquisaCliente"
              />
              <label class="form-check-label fw-bold" for="habilitaPesquisaCliente"
                >Exibir a pesquisa no cardápio</label
              >
            </div>
            <p class="text-muted small">Campos pedidos ao cliente:</p>
            @for (c of camposPesquisa; track c.campo) {
              <div class="form-check form-switch mb-2 ms-3">
                <input
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                  [id]="c.campo"
                  [formControlName]="c.campo"
                />
                <label class="form-check-label" [for]="c.campo">
                  <i class="fa-solid fa-fw text-muted" [class]="c.icone"></i> {{ c.rotulo }}
                </label>
              </div>
            }
          </app-ibox>
        </div>
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button
          type="submit"
          class="btn btn-primary btn-sm"
          [disabled]="salvando() || carregando()"
        >
          <i class="fa-solid" [class]="salvando() ? 'fa-spinner fa-spin' : 'fa-check'"></i>
          {{ configuracao() ? 'Salvar configuração' : 'Criar configuração' }}
        </button>
      </div>
    </form>
  `,
})
export class MenuConfiguracao {
  readonly menuId = input.required<number>();

  private readonly api = inject(ConfiguracoesMenuApi);
  private readonly notificacoes = inject(Notificacoes);

  protected readonly idiomas = IDIOMAS;
  protected readonly nomes = NOMES_IDIOMAS;
  protected readonly camposPesquisa = CAMPOS_PESQUISA;
  protected readonly configuracao = signal<ConfiguracaoMenu | null>(null);
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);

  protected readonly form = new FormGroup({
    habilitaPT: booleano(true),
    habilitaEN: booleano(),
    habilitaES: booleano(),
    habilitaFR: booleano(),
    habilitaPL: booleano(),
    habilitaDE: booleano(),
    habilitaPesquisaCliente: booleano(),
    habilitaPesquisaClienteNome: booleano(),
    habilitaPesquisaClienteDataNiver: booleano(),
    habilitaPesquisaClienteEmail: booleano(),
    habilitaPesquisaClientePhone: booleano(),
  });

  constructor() {
    effect(() => {
      const menuId = this.menuId();
      untracked(() => {
        this.carregando.set(true);
        this.api
          .listar({ menuId })
          .then(([configuracao]) => this.carregar(configuracao ?? null))
          .finally(() => this.carregando.set(false));
      });
    });
    // Os campos só fazem sentido com a pesquisa habilitada
    this.form.controls.habilitaPesquisaCliente.valueChanges.subscribe((ligada) =>
      this.alternarCamposPesquisa(ligada),
    );
  }

  protected async salvar(): Promise<void> {
    this.salvando.set(true);
    try {
      const dados = this.form.getRawValue();
      const atual = this.configuracao();
      const salva = atual
        ? await this.api.atualizar(atual.id, dados)
        : await this.api.criar({ ...dados, menuId: this.menuId() });
      this.carregar(salva);
      this.notificacoes.sucesso('Configuração do menu salva.');
    } catch {
      // erro já exibido pelo interceptor
    } finally {
      this.salvando.set(false);
    }
  }

  private carregar(configuracao: ConfiguracaoMenu | null): void {
    this.configuracao.set(configuracao);
    this.form.reset(configuracao ?? undefined);
    this.alternarCamposPesquisa(this.form.controls.habilitaPesquisaCliente.value);
  }

  private alternarCamposPesquisa(ligada: boolean): void {
    for (const { campo } of CAMPOS_PESQUISA) {
      const controle = this.form.controls[campo];
      if (ligada) controle.enable({ emitEvent: false });
      else controle.disable({ emitEvent: false });
    }
  }
}
