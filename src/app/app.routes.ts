import type { Routes } from '@angular/router';
import {
  exigeLogin,
  exigeRestaurante,
  exigeSuperUsuario,
  podeSelecionarRestaurante,
} from './core/restaurante-atual';
import { Layout } from './layout/layout';

/**
 * Rotas do admin: login (/login) → escolha do restaurante (/selecionar-restaurante, só
 * para quem administra mais de um ou é superusuário) → telas do admin. Cada entidade tem a lista (/<entidade>) e o formulário (/<entidade>/novo e
 * /<entidade>/:id). Os filtros das listas ficam na query string.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar | Menu Admin',
    loadComponent: () => import('./paginas/login/login').then((m) => m.Login),
  },
  {
    path: 'selecionar-restaurante',
    title: 'Escolha o restaurante | Menu Admin',
    canActivate: [exigeLogin, podeSelecionarRestaurante],
    loadComponent: () =>
      import('./paginas/selecao-restaurante/selecao-restaurante').then((m) => m.SelecaoRestaurante),
  },
  {
    // Telas do admin: exigem um restaurante escolhido e trabalham dentro dele
    path: '',
    component: Layout,
    canActivate: [exigeLogin, exigeRestaurante],
    children: [
      {
        path: '',
        title: 'Dashboard | Menu Admin',
        loadComponent: () => import('./paginas/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'menus',
        title: 'Menus | Menu Admin',
        loadComponent: () => import('./paginas/menus/menus-lista').then((m) => m.MenusLista),
      },
      {
        path: 'menus/:id',
        title: 'Menu | Menu Admin',
        loadComponent: () => import('./paginas/menus/menu-detalhe').then((m) => m.MenuDetalhe),
      },
      {
        path: 'categorias',
        title: 'Categorias | Menu Admin',
        loadComponent: () =>
          import('./paginas/categorias/categorias-lista').then((m) => m.CategoriasLista),
      },
      {
        path: 'categorias/:id',
        title: 'Categoria | Menu Admin',
        loadComponent: () =>
          import('./paginas/categorias/categoria-form').then((m) => m.CategoriaForm),
      },
      {
        path: 'subcategorias',
        title: 'Subcategorias | Menu Admin',
        loadComponent: () =>
          import('./paginas/subcategorias/subcategorias-lista').then((m) => m.SubCategoriasLista),
      },
      {
        path: 'subcategorias/:id',
        title: 'Subcategoria | Menu Admin',
        loadComponent: () =>
          import('./paginas/subcategorias/subcategoria-form').then((m) => m.SubCategoriaForm),
      },
      {
        path: 'itens',
        title: 'Itens | Menu Admin',
        loadComponent: () => import('./paginas/itens/itens-lista').then((m) => m.ItensLista),
      },
      {
        path: 'itens/:id',
        title: 'Item | Menu Admin',
        loadComponent: () => import('./paginas/itens/item-form').then((m) => m.ItemForm),
      },
      {
        path: 'clientes',
        title: 'Clientes | Menu Admin',
        loadComponent: () =>
          import('./paginas/clientes/clientes-lista').then((m) => m.ClientesLista),
      },
      {
        path: 'clientes/:id',
        title: 'Cliente | Menu Admin',
        loadComponent: () => import('./paginas/clientes/cliente-form').then((m) => m.ClienteForm),
      },
      {
        path: 'tags',
        title: 'Tags | Menu Admin',
        loadComponent: () => import('./paginas/tags/tags-lista').then((m) => m.TagsLista),
      },
      {
        path: 'tags/:id',
        title: 'Tag | Menu Admin',
        canActivate: [exigeSuperUsuario],
        loadComponent: () => import('./paginas/tags/tag-form').then((m) => m.TagForm),
      },
      {
        path: 'configuracao',
        title: 'Configuração | Menu Admin',
        loadComponent: () =>
          import('./paginas/configuracao/configuracao').then((m) => m.Configuracao),
      },
      {
        path: '**',
        title: 'Página não encontrada | Menu Admin',
        loadComponent: () => import('./paginas/nao-encontrada').then((m) => m.NaoEncontrada),
      },
    ],
  },
];
