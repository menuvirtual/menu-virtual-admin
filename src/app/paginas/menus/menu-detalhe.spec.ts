import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Menu } from '../../core/modelos';
import { RestauranteAtual } from '../../core/restaurante-atual';
import { MenuDetalhe } from './menu-detalhe';

const API = 'http://localhost:3000';
const restaurante = { id: 1, nome: 'Casa Lusitana', slug: 'casa-lusitana' };
const menu: Menu = {
  id: 7,
  nome: 'Menu drinks',
  restauranteId: 1,
  isAtivo: false,
  contemAtualizacaoParaPublicar: false,
  restaurante,
  payload: { restaurante: { nome: { pt: 'Casa Lusitana' } } },
  payloadPreview: { restaurante: { nome: { pt: 'Casa Lusitana' } } },
};

describe('MenuDetalhe: nome do menu', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: RestauranteAtual,
          useValue: { id: signal(1), restaurante: signal(restaurante) },
        },
      ],
    });
  });

  const http = () => TestBed.inject(HttpTestingController);
  const esperar = () => new Promise((resolve) => setTimeout(resolve));
  const criar = async (id: string) => {
    const fixture = TestBed.createComponent(MenuDetalhe);
    fixture.componentRef.setInput('id', id);
    await esperar();
    return fixture;
  };

  it('novo menu: o nome é obrigatório; sem ele não chama a API', async () => {
    const fixture = await criar('novo');
    const html = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    html.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    expect(html.querySelector('#nome.is-invalid')).toBeTruthy();
    http().expectNone(`${API}/admin/menus`);

    const nome = html.querySelector<HTMLInputElement>('#nome')!;
    nome.value = '   ';
    nome.dispatchEvent(new Event('input'));
    html.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    http().expectNone(`${API}/admin/menus`);
  });

  it('novo menu: envia nome, situação e o restaurante atual (e nenhum JSON)', async () => {
    const fixture = await criar('novo');
    const html = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    const nome = html.querySelector<HTMLInputElement>('#nome')!;
    nome.value = 'Menu noite';
    nome.dispatchEvent(new Event('input'));
    html.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await esperar();

    const pedido = http().expectOne(`${API}/admin/menus`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ nome: 'Menu noite', isAtivo: false, restauranteId: 1 });
    pedido.flush({ ...menu, id: 8, nome: 'Menu noite' });
  });

  it('editar: mostra o nome no título e permite renomear (só nome e situação vão na alteração)', async () => {
    const fixture = await criar('7');
    const html = fixture.nativeElement as HTMLElement;
    http().expectOne(`${API}/admin/menus/7`).flush(menu);
    await esperar(); // o menu é carregado por uma Promise
    fixture.detectChanges();

    expect(html.querySelector('.page-heading h2')?.textContent).toBe('Menu drinks');
    const nome = html.querySelector<HTMLInputElement>('#nome')!;
    expect(nome.value).toBe('Menu drinks');

    nome.value = 'Menu drinks e petiscos';
    nome.dispatchEvent(new Event('input'));
    html.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await esperar();
    const pedido = http().expectOne(`${API}/admin/menus/7`);
    expect(pedido.request.method).toBe('PATCH');
    expect(pedido.request.body).toEqual({ nome: 'Menu drinks e petiscos', isAtivo: false });
    pedido.flush({ ...menu, nome: 'Menu drinks e petiscos' });
    await esperar();
    fixture.detectChanges();
    expect(html.querySelector('.page-heading h2')?.textContent).toBe('Menu drinks e petiscos');
  });
});
