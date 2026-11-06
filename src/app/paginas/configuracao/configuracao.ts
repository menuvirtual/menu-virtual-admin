import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RestaurantesApi } from '../../core/api';
import { API_URL } from '../../core/api-url';
import { Autenticacao } from '../../core/autenticacao';
import { Confirmacao } from '../../core/confirmacao';
import { Notificacoes } from '../../core/notificacoes';
import { RestauranteAtual } from '../../core/restaurante-atual';
import { filtrosDaUrl, invalido, naoEmBranco, REGEX_SLUG } from '../../shared/formularios';
import { Ibox } from '../../shared/ibox';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { SeletorCardapio } from '../../shared/seletor-cardapio';
import { MenuConfiguracao } from '../menus/menu-configuracao';

/**
 * Configuração do restaurante administrado: dados do restaurante (nome e slug),
 * configuração de cada menu (idiomas e pesquisa do cliente) e exclusão.
 */
@Component({
  selector: 'app-configuracao',
  imports: [ReactiveFormsModule, RouterLink, Ibox, PaginaTitulo, SeletorCardapio, MenuConfiguracao],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracao.html',
})
export class Configuracao {
  private readonly api = inject(RestaurantesApi);
  private readonly atual = inject(RestauranteAtual);
  private readonly router = inject(Router);
  private readonly confirmacao = inject(Confirmacao);
  private readonly notificacoes = inject(Notificacoes);

  private readonly auth = inject(Autenticacao);
  protected readonly apiUrl = inject(API_URL);
  /** Excluir restaurante: só superusuários */
  protected readonly superUsuario = this.auth.superUsuario;
  protected readonly restaurante = this.atual.restaurante;
  /** Menu cuja configuração está sendo editada (na URL: ?menuId=) */
  protected readonly filtros = filtrosDaUrl(['menuId'] as const);
  protected readonly salvando = signal(false);
  protected readonly invalido = invalido;

  protected readonly form = new FormGroup({
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120), naoEmBranco],
    }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60), Validators.pattern(REGEX_SLUG)],
    }),
  });

  constructor() {
    effect(() => {
      const r = this.restaurante();
      untracked(() => r && this.form.reset({ nome: r.nome, slug: r.slug }));
    });
  }

  protected async salvar(): Promise<void> {
    const id = this.atual.id();
    if (this.form.invalid || !id) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    try {
      const salvo = await this.api.atualizar(id, this.form.getRawValue());
      this.atual.atualizar(salvo);
      await this.auth.carregarPerfil();
      this.notificacoes.sucesso('Dados do restaurante salvos.');
    } catch {
      // erro já exibido pelo interceptor
    } finally {
      this.salvando.set(false);
    }
  }

  protected async excluir(): Promise<void> {
    const r = this.restaurante();
    if (!r) return;
    const ok = await this.confirmacao.perguntar(
      `Excluir o restaurante "${r.nome}"? Só é possível se ele não tiver menus nem clientes.`,
      { titulo: 'Excluir restaurante' },
    );
    if (!ok) return;
    try {
      await this.api.remover(r.id);
      this.notificacoes.sucesso(`Restaurante "${r.nome}" excluído.`);
      this.atual.limpar();
      await this.auth.carregarPerfil();
      await this.router.navigate(['/selecionar-restaurante']);
    } catch {
      // erro já exibido pelo interceptor
    }
  }
}
