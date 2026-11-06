import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Confirmacao } from '../../core/confirmacao';
import type { Menu } from '../../core/modelos';
import { RestauranteAtual } from '../../core/restaurante-atual';
import { MenusLista } from './menus-lista';

const API = 'http://localhost:3000';
const restaurante = { id: 1, nome: 'Casa Lusitana', slug: 'casa-lusitana' };
const menu = (id: number, dados: Partial<Menu>): Menu => ({
  id,
  nome: `Menu ${id === 2 ? 'noite' : 'dia'}`,
  restauranteId: 1,
  isAtivo: false,
  contemAtualizacaoParaPublicar: false,
  restaurante,
  ...dados,
});

describe('MenusLista: publicar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RestauranteAtual, useValue: { id: signal(1) } },
      ],
    });
  });

  const http = () => TestBed.inject(HttpTestingController);
  const esperar = () => new Promise((resolve) => setTimeout(resolve));

  it('mostra a coluna de atualizações e o botão Publicar só quando há algo a publicar', async () => {
    const fixture = TestBed.createComponent(MenusLista);
    const html = fixture.nativeElement as HTMLElement;
    await esperar();
    http()
      .expectOne((r) => r.url === `${API}/admin/menus`)
      .flush([
        menu(2, { isAtivo: true, contemAtualizacaoParaPublicar: true }),
        menu(1, { isAtivo: false }),
      ]);
    await fixture.whenStable();

    expect([...html.querySelectorAll('thead th')].map((th) => th.textContent?.trim())).toContain(
      'Atualizações',
    );
    const [comAtualizacao, semAtualizacao] = [...html.querySelectorAll('tbody tr')];
    // o nome identifica o menu na lista
    expect(comAtualizacao.querySelector('a')?.textContent?.trim()).toBe('Menu noite');
    expect(semAtualizacao.querySelector('a')?.textContent?.trim()).toBe('Menu dia');
    expect(comAtualizacao.textContent).toContain('Para publicar');
    expect(comAtualizacao.textContent).toContain('Publicar');
    expect(semAtualizacao.textContent).toContain('Em dia');
    expect(
      [...semAtualizacao.querySelectorAll('button')].map((b) => b.textContent?.trim()),
    ).toEqual(['Ativar', '']);
  });

  it('publica depois de confirmar e recarrega a lista', async () => {
    const fixture = TestBed.createComponent(MenusLista);
    const html = fixture.nativeElement as HTMLElement;
    await esperar();
    http()
      .expectOne((r) => r.url === `${API}/admin/menus`)
      .flush([menu(2, { isAtivo: true, contemAtualizacaoParaPublicar: true })]);
    await fixture.whenStable();

    const publicar = [...html.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Publicar'),
    )!;
    publicar.click();
    await esperar();
    const pedido = TestBed.inject(Confirmacao).pedido()!;
    expect(pedido.mensagem).toContain('Menu noite');
    pedido.responder(true);
    await esperar();

    http()
      .expectOne(`${API}/admin/menus/2/publicar`)
      .flush(menu(2, { isAtivo: true }));
    await esperar();
    fixture.detectChanges(); // a recarga do httpResource sai no próximo ciclo
    await esperar();
    http()
      .expectOne((r) => r.url === `${API}/admin/menus`)
      .flush([menu(2, { isAtivo: true, contemAtualizacaoParaPublicar: false })]);
    await fixture.whenStable();
    expect(html.querySelector('tbody')?.textContent).not.toContain('Publicar');
    expect(html.querySelector('tbody')?.textContent).toContain('Em dia');
  });

  it('cancelar a confirmação não chama a API', async () => {
    const fixture = TestBed.createComponent(MenusLista);
    const html = fixture.nativeElement as HTMLElement;
    await esperar();
    http()
      .expectOne((r) => r.url === `${API}/admin/menus`)
      .flush([menu(2, { contemAtualizacaoParaPublicar: true })]);
    await fixture.whenStable();
    [...html.querySelectorAll('button')].find((b) => b.textContent?.includes('Publicar'))!.click();
    await esperar();
    TestBed.inject(Confirmacao).pedido()!.responder(false);
    await esperar();
    http().expectNone(`${API}/admin/menus/2/publicar`);
  });
});
