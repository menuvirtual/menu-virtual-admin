import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaginaTitulo } from '../shared/pagina-titulo';

@Component({
  selector: 'app-nao-encontrada',
  imports: [RouterLink, PaginaTitulo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina-titulo titulo="Página não encontrada" />
    <div class="wrapper wrapper-content text-center">
      <h1 class="display-1 fw-bold">404</h1>
      <h3>Página não encontrada</h3>
      <p>O endereço acessado não existe no painel.</p>
      <a routerLink="/" class="btn btn-primary">Voltar ao dashboard</a>
    </div>
  `,
})
export class NaoEncontrada {}
