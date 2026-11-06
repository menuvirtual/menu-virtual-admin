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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClientesApi } from '../../core/api';
import type { Cliente } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { invalido, naoEmBranco, numeroOuNulo } from '../../shared/formularios';
import { Ibox } from '../../shared/ibox';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { RestauranteAtual } from '../../core/restaurante-atual';

@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, RouterLink, Ibox, PaginaTitulo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina-titulo
      [titulo]="novo() ? 'Novo cliente' : 'Editar cliente'"
      [trilha]="[
        { rotulo: 'Clientes', link: '/clientes' },
        { rotulo: novo() ? 'Novo' : (registro()?.nome ?? '...') },
      ]"
    />
    <div class="wrapper wrapper-content">
      <div class="row">
        <div class="col-xl-7">
          <form [formGroup]="form" (ngSubmit)="salvar()" novalidate>
            <app-ibox titulo="Dados do cliente">
              <div class="row">
                <div class="col-md-8 mb-3">
                  <label class="form-label" for="nome"
                    >Nome <span class="text-danger">*</span></label
                  >
                  <input
                    id="nome"
                    class="form-control"
                    formControlName="nome"
                    maxlength="255"
                    [class.is-invalid]="invalido(form.controls.nome)"
                  />
                  <div class="invalid-feedback">Informe o nome.</div>
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label" for="dataNascimento">Data de nascimento</label>
                  <input
                    id="dataNascimento"
                    type="date"
                    class="form-control"
                    formControlName="dataNascimento"
                    [max]="hoje"
                    [class.is-invalid]="invalido(form.controls.dataNascimento)"
                  />
                </div>
                <div class="col-md-7 mb-3">
                  <label class="form-label" for="email">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    class="form-control"
                    formControlName="email"
                    maxlength="255"
                    [class.is-invalid]="invalido(form.controls.email)"
                  />
                  <div class="invalid-feedback">E-mail inválido.</div>
                </div>
                <div class="col-md-5 mb-3">
                  <label class="form-label" for="phone">Telefone</label>
                  <input
                    id="phone"
                    type="tel"
                    class="form-control"
                    formControlName="phone"
                    maxlength="30"
                    placeholder="+55 11 99999-9999"
                  />
                </div>
              </div>
              <div ibox-rodape class="ibox-footer">
                <a routerLink="/clientes" class="btn btn-white btn-sm">Cancelar</a>
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
export class ClienteForm {
  /** Parâmetro da rota: "novo" ou o id */
  readonly id = input.required<string>();

  private readonly api = inject(ClientesApi);
  private readonly router = inject(Router);
  private readonly notificacoes = inject(Notificacoes);

  protected readonly novo = computed(() => this.id() === 'novo');
  protected readonly idNumero = computed(() => (this.novo() ? null : numeroOuNulo(this.id())));
  protected readonly registro = signal<Cliente | null>(null);
  private readonly restauranteId = inject(RestauranteAtual).id;
  protected readonly salvando = signal(false);
  protected readonly invalido = invalido;
  protected readonly hoje = new Date().toISOString().slice(0, 10);

  protected readonly form = new FormGroup({
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255), naoEmBranco],
    }),
    dataNascimento: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    phone: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const id = this.idNumero();
      untracked(() => {
        this.registro.set(null);
        this.form.reset();
        if (id)
          this.api.obter(id).then(
            (c) => this.carregar(c),
            () => this.router.navigate(['/clientes']),
          );
      });
    });
  }

  protected async salvar(): Promise<void> {
    const restauranteId = this.restauranteId();
    if (this.form.invalid || !restauranteId) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    try {
      const v = this.form.getRawValue();
      const dados = {
        restauranteId,
        nome: v.nome,
        // vazio -> null (apaga o valor)
        dataNascimento: v.dataNascimento || null,
        email: v.email.trim() || null,
        phone: v.phone.trim() || null,
      };
      const id = this.idNumero();
      const salvo = id ? await this.api.atualizar(id, dados) : await this.api.criar(dados);
      this.notificacoes.sucesso(`Cliente "${salvo.nome}" salvo.`);
      if (!id) await this.router.navigate(['/clientes', salvo.id]);
      else this.carregar(salvo);
    } catch {
      // erro já exibido pelo interceptor
    } finally {
      this.salvando.set(false);
    }
  }

  private carregar(cliente: Cliente): void {
    if (cliente.restauranteId !== this.restauranteId()) {
      this.notificacoes.erro(
        'Este cliente é de outro restaurante. Troque de restaurante para editá-lo.',
      );
      void this.router.navigate(['/clientes']);
      return;
    }
    this.registro.set(cliente);
    this.form.reset({
      nome: cliente.nome,
      dataNascimento: cliente.dataNascimento ?? '',
      email: cliente.email ?? '',
      phone: cliente.phone ?? '',
    });
  }
}
