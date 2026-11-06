import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { mensagemDeErro } from '../core/interceptor-erros';
import { rotuloMenu } from '../core/modelos';
import { formatarData } from '../paginas/clientes/clientes-lista';

import { controlesIdioma, gerarSlug, numeroOuNulo, valoresIdioma } from './formularios';
import { SituacaoMenu } from './situacao-menu';

describe('utilitários do admin', () => {
  it('gerarSlug: remove acentos e símbolos', () => {
    expect(gerarSlug('  Cantina São João & Cia! ')).toBe('cantina-sao-joao-cia');
  });

  it('formatarData: AAAA-MM-DD -> DD/MM/AAAA sem mexer no fuso', () => {
    expect(formatarData('1990-01-01')).toBe('01/01/1990');
    expect(formatarData(null)).toBe('—');
  });

  it('numeroOuNulo: só ids inteiros positivos', () => {
    expect(numeroOuNulo('12')).toBe(12);
    expect(numeroOuNulo('novo')).toBeNull();
    expect(numeroOuNulo('0')).toBeNull();
    expect(numeroOuNulo(null)).toBeNull();
  });

  it('controlesIdioma: 6 idiomas, PT obrigatório quando pedido', () => {
    const form = new FormGroup(controlesIdioma('descricao', true));
    expect(Object.keys(form.controls)).toEqual([
      'descricaoPT',
      'descricaoEN',
      'descricaoES',
      'descricaoFR',
      'descricaoPL',
      'descricaoDE',
    ]);
    expect(form.valid).toBe(false);
    form.controls['descricaoPT'].setValue('   ');
    expect(form.valid).toBe(false);
    form.patchValue(valoresIdioma('descricao', { descricaoPT: 'Bebidas', descricaoEN: null }));
    expect(form.valid).toBe(true);
    expect(form.controls['descricaoEN'].value).toBe('');
  });

  it('mensagemDeErro: usa a mensagem da API (texto ou lista)', () => {
    expect(
      mensagemDeErro(new HttpErrorResponse({ status: 409, error: { message: 'Já existe.' } })),
    ).toBe('Já existe.');
    expect(
      mensagemDeErro(new HttpErrorResponse({ status: 400, error: { message: ['a.', 'b.'] } })),
    ).toBe('a. b.');
    expect(mensagemDeErro(new HttpErrorResponse({ status: 0 }))).toContain('conectar à API');
  });

  it('rotuloMenu / SituacaoMenu: Ativo ou Inativo', async () => {
    expect(rotuloMenu({ nome: 'Menu noite', isAtivo: true })).toBe('Menu noite · Ativo');
    expect(rotuloMenu({ nome: 'Menu dia', isAtivo: false })).toBe('Menu dia · Inativo');
    const fixture = TestBed.createComponent(SituacaoMenu);
    fixture.componentRef.setInput('menu', { isAtivo: true });
    await fixture.whenStable();
    const rotulo = (fixture.nativeElement as HTMLElement).querySelector('.label')!;
    expect(rotulo.textContent).toBe('Ativo');
    expect(rotulo.classList).toContain('label-primary');
  });
});
