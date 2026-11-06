import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IDIOMAS, NOMES_IDIOMAS, type Idioma } from '../core/modelos';

/**
 * Campo traduzido nos 6 idiomas (abas PT, EN, ES, FR, PL, DE).
 * O grupo do formulário deve ter os controles `<prefixo>PT`, `<prefixo>EN`...
 */
@Component({
  selector: 'app-campos-idioma',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="form-label" [attr.for]="idCampo(aba())">
      {{ rotulo() }}
      @if (obrigatorioPT()) {
        <span class="text-danger">*</span>
      }
    </label>
    <ul class="nav nav-tabs" role="tablist">
      @for (idioma of idiomas; track idioma) {
        <li class="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            class="nav-link"
            [class.active]="aba() === idioma"
            [attr.aria-selected]="aba() === idioma"
            [title]="nomes[idioma]"
            (click)="aba.set(idioma)"
          >
            {{ idioma }}
            @if (preenchido(idioma)) {
              <i class="fa-solid fa-circle preenchido" title="Preenchido"></i>
            }
            @if (invalido(idioma)) {
              <i class="fa-solid fa-circle-exclamation text-danger"></i>
            }
          </button>
        </li>
      }
    </ul>
    <div class="painel">
      @for (idioma of idiomas; track idioma) {
        @if (aba() === idioma) {
          @if (multilinha()) {
            <textarea
              class="form-control"
              rows="3"
              maxlength="255"
              [id]="idCampo(idioma)"
              [formControl]="controle(idioma)"
              [class.is-invalid]="invalido(idioma)"
              [placeholder]="rotulo() + ' em ' + nomes[idioma].toLowerCase()"
            ></textarea>
          } @else {
            <input
              class="form-control"
              maxlength="255"
              [id]="idCampo(idioma)"
              [formControl]="controle(idioma)"
              [class.is-invalid]="invalido(idioma)"
              [placeholder]="rotulo() + ' em ' + nomes[idioma].toLowerCase()"
            />
          }
          @if (invalido(idioma)) {
            <div class="invalid-feedback">Informe {{ rotulo().toLowerCase() }} em português.</div>
          }
        }
      }
    </div>
  `,
  styles: `
    .nav-link {
      padding: 6px 14px;
      font-size: 12px;
    }
    .preenchido {
      font-size: 6px;
      vertical-align: middle;
      color: #1ab394;
      margin-left: 3px;
    }
    .painel {
      border: 1px solid #e7eaec;
      border-top: 0;
      padding: 10px;
      background: #fff;
    }
  `,
})
export class CamposIdioma {
  readonly grupo = input.required<FormGroup>();
  /** "descricao" ou "nome" */
  readonly prefixo = input.required<string>();
  readonly rotulo = input.required<string>();
  readonly obrigatorioPT = input(false);
  readonly multilinha = input(false);

  protected readonly idiomas = IDIOMAS;
  protected readonly nomes = NOMES_IDIOMAS;
  protected readonly aba = signal<Idioma>('PT');
  /**
   * Muda a cada evento do formulário (valor, touched, status...). O template lê
   * este sinal para se atualizar quando o pai mexe no formulário (ex.: ao tentar
   * salvar, markAllAsTouched precisa exibir os erros aqui dentro).
   */
  protected readonly versao = signal(0);

  constructor() {
    effect((aoLimpar) => {
      const inscricao = this.grupo().events.subscribe(() => this.versao.update((v) => v + 1));
      aoLimpar(() => inscricao.unsubscribe());
    });
  }

  protected controle(idioma: Idioma): FormControl<string> {
    return this.grupo().get(`${this.prefixo()}${idioma}`) as FormControl<string>;
  }

  protected idCampo(idioma: Idioma): string {
    return `campo-${this.prefixo()}-${idioma}`;
  }

  protected preenchido(idioma: Idioma): boolean {
    this.versao();
    return !!this.controle(idioma).value?.trim();
  }

  protected invalido(idioma: Idioma): boolean {
    this.versao();
    const c = this.controle(idioma);
    return c.invalid && (c.touched || c.dirty);
  }
}
