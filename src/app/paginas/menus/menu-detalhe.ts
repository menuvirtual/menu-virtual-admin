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
import { MenusApi } from '../../core/api';
import { API_URL } from '../../core/api-url';
import type { Menu } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { PublicarMenu } from '../../core/publicar-menu';
import { RestauranteAtual } from '../../core/restaurante-atual';
import { invalido, naoEmBranco, numeroOuNulo } from '../../shared/formularios';
import { Ibox } from '../../shared/ibox';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { SituacaoMenu } from '../../shared/situacao-menu';
import { MenuConfiguracao } from './menu-configuracao';
import { MenuEstrutura } from './menu-estrutura';

type Aba = 'dados' | 'configuracao' | 'estrutura';
/** Versão do JSON exibida */
type Versao = 'payload' | 'payloadPreview';

@Component({
  selector: 'app-menu-detalhe',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Ibox,
    PaginaTitulo,
    SituacaoMenu,
    MenuConfiguracao,
    MenuEstrutura,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-detalhe.html',
  styles: `
    .versoes {
      margin-bottom: 0;
    }
    .versoes .nav-link {
      padding: 6px 14px;
      font-size: 12px;
    }
    .payload {
      border-top: 0;
      font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
      font-size: 12px;
      min-height: 420px;
      background: #fafafa;
    }
  `,
})
export class MenuDetalhe {
  /** Parâmetro da rota: "novo" ou o id */
  readonly id = input.required<string>();

  private readonly api = inject(MenusApi);
  private readonly router = inject(Router);
  private readonly notificacoes = inject(Notificacoes);
  private readonly publicacao = inject(PublicarMenu);
  private readonly apiUrl = inject(API_URL);
  private readonly atual = inject(RestauranteAtual);
  private readonly restauranteId = this.atual.id;
  protected readonly restaurante = this.atual.restaurante;

  protected readonly novo = computed(() => this.id() === 'novo');
  protected readonly idNumero = computed(() => (this.novo() ? null : numeroOuNulo(this.id())));
  protected readonly registro = signal<Menu | null>(null);
  protected readonly aba = signal<Aba>('dados');
  protected readonly salvando = signal(false);
  protected readonly publicando = signal(false);

  protected readonly invalido = invalido;

  /** Nome e situação são editáveis; os JSON são gerados pela API a partir das tabelas */
  protected readonly form = new FormGroup({
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80), naoEmBranco],
    }),
    isAtivo: new FormControl(false, { nonNullable: true }),
  });

  /** Versão do JSON exibida (somente leitura) */
  protected readonly versao = signal<Versao>('payload');
  protected readonly json = computed(() =>
    JSON.stringify(this.registro()?.[this.versao()] ?? {}, null, 2),
  );

  constructor() {
    effect(() => {
      const id = this.idNumero();
      untracked(() => {
        this.registro.set(null);
        this.aba.set('dados');
        this.versao.set('payload');
        this.form.reset();
        if (id) void this.carregarDaApi(id);
      });
    });
  }

  /** Endereço público (só faz sentido para o menu ativo) */
  protected urlPublica(menu: Menu, preview: boolean): string {
    return `${this.apiUrl}/menu?restaurante=${menu.restaurante?.slug}${preview ? '&preview=true' : ''}`;
  }

  protected async recarregar(): Promise<void> {
    const id = this.idNumero();
    if (id) await this.carregarDaApi(id);
  }

  protected async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.json());
      this.notificacoes.info('JSON copiado.');
    } catch {
      this.notificacoes.erro('Não foi possível copiar. Selecione o texto e copie com Ctrl+C.');
    }
  }

  protected async publicar(): Promise<void> {
    const menu = this.registro();
    if (!menu) return;
    this.publicando.set(true);
    try {
      const publicado = await this.publicacao.publicar(menu);
      if (publicado) this.carregar(publicado);
    } finally {
      this.publicando.set(false);
    }
  }

  protected async salvar(): Promise<void> {
    const restauranteId = this.restauranteId();
    if (this.form.invalid || !restauranteId) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    try {
      const dados = this.form.getRawValue();
      const id = this.idNumero();
      const salvo = id
        ? await this.api.atualizar(id, dados)
        : await this.api.criar({ ...dados, restauranteId });
      this.notificacoes.sucesso(`Menu "${salvo.nome}" salvo.`);
      if (!id) await this.router.navigate(['/menus', salvo.id]);
      else this.carregar(salvo);
    } catch {
      // erro já exibido pelo interceptor
    } finally {
      this.salvando.set(false);
    }
  }

  private async carregarDaApi(id: number): Promise<void> {
    try {
      this.carregar(await this.api.obter(id));
    } catch {
      await this.router.navigate(['/menus']);
    }
  }

  private carregar(menu: Menu): void {
    if (menu.restauranteId !== this.restauranteId()) {
      this.notificacoes.erro(
        `O menu "${menu.nome}" pertence a outro restaurante. Troque de restaurante para editá-lo.`,
      );
      void this.router.navigate(['/menus']);
      return;
    }
    this.registro.set(menu);
    this.form.reset({ nome: menu.nome, isAtivo: menu.isAtivo });
  }
}
