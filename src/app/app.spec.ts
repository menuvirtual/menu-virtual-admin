import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Autenticacao } from './core/autenticacao';
import { interceptorAuth } from './core/interceptor-auth';
import type { Perfil, Restaurante } from './core/modelos';
import {
  exigeLogin,
  exigeRestaurante,
  exigeSuperUsuario,
  podeSelecionarRestaurante,
  RestauranteAtual,
} from './core/restaurante-atual';
import { Layout } from './layout/layout';

const API = 'http://localhost:3000';
const casa: Restaurante = { id: 1, nome: 'Casa Lusitana', slug: 'casa-lusitana' };
const chapa: Restaurante = { id: 2, nome: 'Chapa Quente', slug: 'chapa-quente' };
const italiana: Restaurante = { id: 5, nome: 'Casa Italiana', slug: 'casa-italiana' };

/** Sessão salva no navegador (lida pelo serviço de autenticação ao ser criado) */
function sessaoSalva(usuario: string, expiraEm = Date.now() / 1000 + 3600): void {
  localStorage.setItem(
    'menuAdmin.sessao',
    JSON.stringify({ accessToken: `token-${usuario}`, refreshToken: 'rt', expiraEm, usuario }),
  );
}

const http = () => TestBed.inject(HttpTestingController);
const executar = <T>(guard: () => T) => TestBed.runInInjectionContext(guard);
const url = (resultado: unknown) => TestBed.inject(Router).serializeUrl(resultado as UrlTree);

/** Loga com o perfil informado (responde o GET /admin/eu) */
async function logar(perfil: Perfil): Promise<void> {
  sessaoSalva(perfil.usuario);
  const carregando = TestBed.inject(Autenticacao).carregarPerfil();
  http().expectOne(`${API}/admin/eu`).flush(perfil);
  await carregando;
}

describe('Admin: login e restaurante', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        // qualquer URL é aceita (ex.: sair() navega para /login)
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([interceptorAuth])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('guards em paralelo (recarregar a página): esperam o mesmo perfil', async () => {
    sessaoSalva('USER1');
    localStorage.setItem('menuAdmin.restauranteId.user1', '2');
    const login = executar(() => exigeLogin({} as never, { url: '/tags' } as never));
    const restaurante = executar(() => exigeRestaurante({} as never, {} as never));
    http()
      .expectOne(`${API}/admin/eu`)
      .flush({ usuario: 'USER1', superUsuario: false, restaurantes: [casa, chapa] });
    expect(await login).toBe(true);
    expect(await restaurante).toBe(true);
    expect(TestBed.inject(RestauranteAtual).restaurante()).toEqual(chapa);
  });

  it('sem sessão, as telas mandam para o login', async () => {
    expect(url(await executar(() => exigeLogin({} as never, { url: '/itens' } as never)))).toBe(
      '/login?retorno=%2Fitens',
    );
  });

  it('com 1 restaurante, entra direto nele (sem tela de seleção)', async () => {
    await logar({ usuario: 'USER2', superUsuario: false, restaurantes: [italiana] });
    expect(await executar(() => exigeRestaurante({} as never, {} as never))).toBe(true);
    expect(TestBed.inject(RestauranteAtual).restaurante()).toEqual(italiana);
    expect(TestBed.inject(Autenticacao).podeTrocarRestaurante()).toBe(false);
    expect(url(await executar(() => podeSelecionarRestaurante({} as never, {} as never)))).toBe(
      '/',
    );
  });

  it('com vários restaurantes, pede a escolha e lembra dela', async () => {
    await logar({ usuario: 'USER1', superUsuario: false, restaurantes: [casa, chapa] });
    expect(url(await executar(() => exigeRestaurante({} as never, {} as never)))).toBe(
      '/selecionar-restaurante',
    );
    expect(await executar(() => podeSelecionarRestaurante({} as never, {} as never))).toBe(true);
    TestBed.inject(RestauranteAtual).selecionar(chapa);
    expect(localStorage.getItem('menuAdmin.restauranteId.user1')).toBe('2');
    expect(await executar(() => exigeRestaurante({} as never, {} as never))).toBe(true);
  });

  it('outro usuário logado não herda o restaurante escolhido pelo anterior', async () => {
    await logar({ usuario: 'USER2', superUsuario: false, restaurantes: [italiana] });
    TestBed.inject(RestauranteAtual).selecionar(italiana);
    TestBed.inject(Autenticacao).sair();
    await logar({
      usuario: 'SUPERUSER',
      superUsuario: true,
      restaurantes: [casa, chapa, italiana],
    });
    expect(TestBed.inject(RestauranteAtual).restaurante()).toBeNull();
    expect(url(await executar(() => exigeRestaurante({} as never, {} as never)))).toBe(
      '/selecionar-restaurante',
    );
  });

  it('editar tags é só para superusuário', async () => {
    await logar({ usuario: 'USER1', superUsuario: false, restaurantes: [casa, chapa] });
    expect(url(await executar(() => exigeSuperUsuario({} as never, {} as never)))).toBe('/tags');
  });

  it('superusuário sempre pode trocar (mesmo com um só restaurante)', async () => {
    await logar({ usuario: 'SUPERUSER', superUsuario: true, restaurantes: [casa] });
    expect(TestBed.inject(Autenticacao).podeTrocarRestaurante()).toBe(true);
    expect(await executar(() => exigeSuperUsuario({} as never, {} as never))).toBe(true);
    expect(url(await executar(() => exigeRestaurante({} as never, {} as never)))).toBe(
      '/selecionar-restaurante',
    );
  });

  it('layout: menu sem "Restaurantes", com "Configuração"; "Trocar" só para quem pode', async () => {
    await logar({ usuario: 'USER1', superUsuario: false, restaurantes: [casa, chapa] });
    TestBed.inject(RestauranteAtual).selecionar(casa);
    let fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    let html = fixture.nativeElement as HTMLElement;
    const itens = [...html.querySelectorAll('.side-menu .nav-label')].map((e) =>
      e.textContent?.trim(),
    );
    expect(itens).toEqual([
      'Dashboard',
      'Menus',
      'Cardápio',
      'Clientes',
      'Tags',
      'Configuração',
      'API (Swagger)',
    ]);
    expect(html.querySelector('.profile-element .nome')?.textContent).toBe('Casa Lusitana');
    expect(html.textContent).toContain('USER1');
    expect(html.textContent).toContain('Trocar restaurante');
    fixture.destroy();

    await logar({ usuario: 'USER2', superUsuario: false, restaurantes: [italiana] });
    TestBed.inject(RestauranteAtual).selecionar(italiana);
    fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).not.toContain('Trocar restaurante');
    expect(html.textContent).toContain('Sair');
  });

  it('layout: recolhe a sidebar (mini-navbar) pelo botão da barra superior', async () => {
    await logar({ usuario: 'USER2', superUsuario: false, restaurantes: [italiana] });
    TestBed.inject(RestauranteAtual).selecionar(italiana);
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.minimalize-styl-2')!
      .click();
    await fixture.whenStable();
    expect(document.body.classList.contains('mini-navbar')).toBe(true);
    fixture.destroy();
    expect(document.body.classList.contains('mini-navbar')).toBe(false);
  });

  describe('interceptor', () => {
    it('envia o Bearer token só para a API do admin (não para /auth)', async () => {
      sessaoSalva('USER1');
      const cliente = TestBed.inject(HttpClient);
      void firstValueFrom(cliente.get(`${API}/admin/menus`));
      expect(http().expectOne(`${API}/admin/menus`).request.headers.get('Authorization')).toBe(
        'Bearer token-USER1',
      );
      void firstValueFrom(cliente.get(`${API}/auth/captcha`));
      expect(http().expectOne(`${API}/auth/captcha`).request.headers.has('Authorization')).toBe(
        false,
      );
    });

    it('401: renova o token e repete a chamada', async () => {
      sessaoSalva('USER1');
      const resposta = firstValueFrom(TestBed.inject(HttpClient).get(`${API}/admin/menus`));
      http()
        .expectOne(`${API}/admin/menus`)
        .flush({ message: 'Sessão expirada.' }, { status: 401, statusText: 'Unauthorized' });
      await new Promise((resolve) => setTimeout(resolve));
      http()
        .expectOne(`${API}/auth/renovar`)
        .flush({ accessToken: 'novo', expiraEm: Date.now() / 1000 + 3600, usuario: 'USER1' });
      await new Promise((resolve) => setTimeout(resolve));
      const repetida = http().expectOne(`${API}/admin/menus`);
      expect(repetida.request.headers.get('Authorization')).toBe('Bearer novo');
      repetida.flush([]);
      expect(await resposta).toEqual([]);
      // o refresh token antigo continua guardado
      expect(TestBed.inject(Autenticacao).sessao()?.refreshToken).toBe('rt');
    });
  });
});
