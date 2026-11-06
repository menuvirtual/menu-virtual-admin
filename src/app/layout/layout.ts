import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { API_URL } from '../core/api-url';
import { Autenticacao } from '../core/autenticacao';
import { RestauranteAtual } from '../core/restaurante-atual';

interface ItemMenu {
  rotulo: string;
  icone: string;
  link?: string;
  filhos?: { rotulo: string; link: string }[];
}

/** Estrutura do admin (Inspinia): sidebar, barra superior, conteúdo e rodapé. */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layout.html',
})
export class Layout {
  private readonly documento = inject(DOCUMENT);
  private readonly router = inject(Router);
  protected readonly apiUrl = inject(API_URL);
  private readonly atual = inject(RestauranteAtual);
  private readonly auth = inject(Autenticacao);
  protected readonly restaurante = this.atual.restaurante;
  protected readonly usuario = this.auth.usuario;
  protected readonly superUsuario = this.auth.superUsuario;
  /** "Trocar restaurante" só para quem administra mais de um ou é superusuário */
  protected readonly podeTrocar = this.auth.podeTrocarRestaurante;
  /** Iniciais do restaurante para o avatar: "Casa Lusitana" -> "CL" */
  protected readonly iniciais = computed(() =>
    (this.restaurante()?.nome ?? '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join(''),
  );
  protected readonly ano = new Date().getFullYear();

  /** Sidebar recolhida (em telas pequenas: sidebar aberta por cima do conteúdo) */
  protected readonly mini = signal(false);
  /** Submenus abertos, pelo rótulo */
  protected readonly abertos = signal<Set<string>>(new Set(['Cardápio']));

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  private readonly caminho = computed(() => this.url().split(/[?#]/)[0]);

  protected readonly itens: ItemMenu[] = [
    { rotulo: 'Dashboard', icone: 'fa-table-cells-large', link: '/' },
    { rotulo: 'Menus', icone: 'fa-book-open', link: '/menus' },
    {
      rotulo: 'Cardápio',
      icone: 'fa-utensils',
      filhos: [
        { rotulo: 'Categorias', link: '/categorias' },
        { rotulo: 'Subcategorias', link: '/subcategorias' },
        { rotulo: 'Itens', link: '/itens' },
      ],
    },
    { rotulo: 'Clientes', icone: 'fa-users', link: '/clientes' },
    { rotulo: 'Tags', icone: 'fa-tags', link: '/tags' },
    { rotulo: 'Configuração', icone: 'fa-gear', link: '/configuracao' },
  ];

  constructor() {
    effect(() => this.documento.body.classList.toggle('mini-navbar', this.mini()));
    inject(DestroyRef).onDestroy(() => this.documento.body.classList.remove('mini-navbar'));
    // Em telas pequenas, fecha a sidebar ao navegar
    effect(() => {
      this.caminho();
      if (this.documento.defaultView?.matchMedia?.('(max-width: 768px)').matches)
        this.mini.set(false);
    });
  }

  /** Volta para a escolha do restaurante */
  protected trocarRestaurante(): void {
    void this.router.navigate(['/selecionar-restaurante']);
  }

  protected sair(): void {
    this.auth.sair();
  }

  protected ativo(item: ItemMenu): boolean {
    const caminho = this.caminho();
    const links = item.filhos?.map((f) => f.link) ?? [item.link!];
    return links.some((link) =>
      link === '/' ? caminho === '/' : caminho === link || caminho.startsWith(`${link}/`),
    );
  }

  protected filhoAtivo(link: string): boolean {
    const caminho = this.caminho();
    return caminho === link || caminho.startsWith(`${link}/`);
  }

  protected aberto(item: ItemMenu): boolean {
    return this.abertos().has(item.rotulo) || this.ativo(item);
  }

  protected alternar(item: ItemMenu): void {
    this.abertos.update((atual) => {
      const novo = new Set(atual);
      if (novo.has(item.rotulo)) novo.delete(item.rotulo);
      else novo.add(item.rotulo);
      return novo;
    });
  }
}
