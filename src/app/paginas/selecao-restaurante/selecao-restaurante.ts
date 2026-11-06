import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RestaurantesApi, ResumoApi } from '../../core/api';
import { Autenticacao } from '../../core/autenticacao';
import type { Restaurante, ResumoRestaurante } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { RestauranteAtual } from '../../core/restaurante-atual';
import { gerarSlug, invalido, naoEmBranco, REGEX_SLUG } from '../../shared/formularios';

/**
 * Escolha do restaurante a administrar (logo depois do login). Só aparece para
 * quem administra mais de um restaurante ou é superusuário (que vê todos e
 * pode cadastrar novos).
 */
@Component({
  selector: 'app-selecao-restaurante',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './selecao-restaurante.html',
  styleUrl: './selecao-restaurante.scss',
})
export class SelecaoRestaurante {
  private readonly api = inject(RestaurantesApi);
  private readonly atual = inject(RestauranteAtual);
  private readonly router = inject(Router);
  private readonly notificacoes = inject(Notificacoes);
  private readonly auth = inject(Autenticacao);

  protected readonly usuario = this.auth.usuario;
  protected readonly superUsuario = this.auth.superUsuario;

  /** Totais de todos os restaurantes (menu ativo, quantidade de menus e clientes) */
  protected readonly resumo = inject(ResumoApi).recurso();
  protected readonly busca = signal('');
  protected readonly restaurantes = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return (this.resumo.value()?.porRestaurante ?? []).filter(
      (r) => !termo || r.nome.toLowerCase().includes(termo) || r.slug.includes(termo),
    );
  });
  protected readonly criando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly invalido = invalido;
  protected readonly ano = new Date().getFullYear();

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

  protected entrar(restaurante: Restaurante | ResumoRestaurante): void {
    this.atual.selecionar({ id: restaurante.id, nome: restaurante.nome, slug: restaurante.slug });
    void this.router.navigate(['/']);
  }

  protected sair(): void {
    this.auth.sair();
  }

  protected sugerirSlug(): void {
    if (!this.form.controls.slug.dirty)
      this.form.controls.slug.setValue(gerarSlug(this.form.controls.nome.value));
  }

  protected async criar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    try {
      const restaurante = await this.api.criar(this.form.getRawValue());
      this.notificacoes.sucesso(`Restaurante "${restaurante.nome}" cadastrado.`);
      await this.auth.carregarPerfil(); // o novo restaurante entra na lista do usuário
      this.entrar(restaurante);
    } catch {
      // erro já exibido pelo interceptor
    } finally {
      this.salvando.set(false);
    }
  }
}
