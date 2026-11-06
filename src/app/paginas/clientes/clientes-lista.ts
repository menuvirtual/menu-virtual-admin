import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientesApi } from '../../core/api';
import { RestauranteAtual } from '../../core/restaurante-atual';
import { Confirmacao } from '../../core/confirmacao';
import type { Cliente } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { Ibox } from '../../shared/ibox';
import { PaginaTitulo } from '../../shared/pagina-titulo';
import { Paginacao, paginar } from '../../shared/paginacao';

/** "1990-05-23" -> "23/05/1990" (sem converter fuso) */
export function formatarData(data: string | null): string {
  if (!data) return '—';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

@Component({
  selector: 'app-clientes-lista',
  imports: [RouterLink, Ibox, PaginaTitulo, Paginacao],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina-titulo titulo="Clientes" [trilha]="[{ rotulo: 'Clientes' }]">
      <a [routerLink]="['/clientes', 'novo']" class="btn btn-primary btn-sm">
        <i class="fa-solid fa-plus"></i> Novo cliente
      </a>
    </app-pagina-titulo>

    <div class="wrapper wrapper-content">
      <app-ibox titulo="Clientes do restaurante" [semEspaco]="true">
        <span ibox-titulo class="label label-primary">{{ clientes.value().length }}</span>
        <div class="barra-lista">
          <input
            type="search"
            class="form-control busca"
            placeholder="Nome, e-mail ou telefone..."
            aria-label="Buscar"
            (input)="buscar($any($event.target).value)"
          />
        </div>
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Aniversário</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th class="acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (c of pagina(); track c.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/clientes', c.id]" class="fw-semibold">{{ c.nome }}</a>
                  </td>
                  <td>{{ formatarData(c.dataNascimento) }}</td>
                  <td>
                    @if (c.email) {
                      <a [href]="'mailto:' + c.email">{{ c.email }}</a>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td>{{ c.phone ?? '—' }}</td>
                  <td class="acoes">
                    <a [routerLink]="['/clientes', c.id]" class="btn btn-white btn-xs"
                      ><i class="fa-solid fa-pencil"></i> Editar</a
                    >
                    <button
                      type="button"
                      class="btn btn-white btn-xs ms-1 text-danger"
                      title="Excluir"
                      (click)="excluir(c)"
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="vazio">
                    @if (clientes.isLoading()) {
                      <i class="fa-solid fa-spinner fa-spin"></i> Carregando...
                    } @else {
                      <i class="fa-solid fa-users"></i> Nenhum cliente encontrado.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-paginacao [total]="clientes.value().length" [(pagina)]="numeroPagina" />
      </app-ibox>
    </div>
  `,
})
export class ClientesLista {
  private readonly api = inject(ClientesApi);
  private readonly confirmacao = inject(Confirmacao);
  private readonly notificacoes = inject(Notificacoes);
  private espera?: ReturnType<typeof setTimeout>;

  private readonly restauranteId = inject(RestauranteAtual).id;
  protected readonly busca = signal('');
  protected readonly clientes = this.api.recursoLista(() => ({
    restauranteId: this.restauranteId(),
    busca: this.busca(),
  }));
  protected readonly numeroPagina = signal(1);
  protected readonly pagina = computed(() => paginar(this.clientes.value(), this.numeroPagina()));
  protected readonly formatarData = formatarData;

  constructor() {
    effect(() => {
      this.busca();
      this.numeroPagina.set(1);
    });
  }

  /** Busca no servidor, esperando o usuário parar de digitar. */
  protected buscar(texto: string): void {
    clearTimeout(this.espera);
    this.espera = setTimeout(() => this.busca.set(texto.trim()), 300);
  }

  protected async excluir(cliente: Cliente): Promise<void> {
    if (!(await this.confirmacao.perguntar(`Excluir o cliente "${cliente.nome}"?`))) return;
    try {
      await this.api.remover(cliente.id);
      this.notificacoes.sucesso(`Cliente "${cliente.nome}" excluído.`);
      this.clientes.reload();
    } catch {
      // erro já exibido pelo interceptor
    }
  }
}
