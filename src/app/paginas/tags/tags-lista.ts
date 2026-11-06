import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TagsApi } from '../../core/api';
import { Autenticacao } from '../../core/autenticacao';
import { Confirmacao } from '../../core/confirmacao';
import type { Tag } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { Ibox } from '../../shared/ibox';
import { IdiomasPreenchidos } from '../../shared/idiomas-preenchidos';
import { PaginaTitulo } from '../../shared/pagina-titulo';

@Component({
  selector: 'app-tags-lista',
  imports: [RouterLink, Ibox, PaginaTitulo, IdiomasPreenchidos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina-titulo titulo="Tags" [trilha]="[{ rotulo: 'Tags' }]">
      @if (superUsuario()) {
        <a routerLink="/tags/novo" class="btn btn-primary btn-sm"
          ><i class="fa-solid fa-plus"></i> Nova tag</a
        >
      }
    </app-pagina-titulo>

    <div class="wrapper wrapper-content">
      <app-ibox
        titulo="Tags dos itens (compartilhadas por todos os restaurantes)"
        [semEspaco]="true"
      >
        @if (!superUsuario()) {
          <div class="alert alert-info rounded-0 mb-0 py-2">
            <i class="fa-solid fa-circle-info"></i> As tags valem para todos os restaurantes; só
            superusuários podem criá-las ou alterá-las. Para usar uma tag, marque-a no item.
          </div>
        }
        <div class="barra-lista">
          <input
            type="search"
            class="form-control busca"
            placeholder="Buscar..."
            aria-label="Buscar"
            (input)="busca.set($any($event.target).value)"
          />
        </div>
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Inglês</th>
                <th>Traduções</th>
                <th>Lista de filtros</th>
                @if (superUsuario()) {
                  <th class="acoes">Ações</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (t of filtradas(); track t.id) {
                <tr>
                  <td>
                    @if (superUsuario()) {
                      <a [routerLink]="['/tags', t.id]" class="fw-semibold">{{ t.descricaoPT }}</a>
                    } @else {
                      <span class="fw-semibold">{{ t.descricaoPT }}</span>
                    }
                  </td>
                  <td class="text-muted">{{ t.descricaoEN ?? '—' }}</td>
                  <td><app-idiomas-preenchidos [entidade]="t" /></td>
                  <td>
                    @if (t.visibleLista) {
                      <span class="label label-primary"
                        ><i class="fa-solid fa-filter"></i> Visível</span
                      >
                    } @else {
                      <span class="label">Oculta</span>
                    }
                  </td>
                  @if (superUsuario()) {
                    <td class="acoes">
                      <a [routerLink]="['/tags', t.id]" class="btn btn-white btn-xs"
                        ><i class="fa-solid fa-pencil"></i> Editar</a
                      >
                      <button
                        type="button"
                        class="btn btn-white btn-xs ms-1 text-danger"
                        title="Excluir"
                        (click)="excluir(t)"
                      >
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="vazio">
                    @if (tags.isLoading()) {
                      <i class="fa-solid fa-spinner fa-spin"></i> Carregando...
                    } @else {
                      <i class="fa-solid fa-tags"></i> Nenhuma tag encontrada.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-ibox>
    </div>
  `,
})
export class TagsLista {
  private readonly api = inject(TagsApi);
  private readonly confirmacao = inject(Confirmacao);
  private readonly notificacoes = inject(Notificacoes);

  /** Só superusuários criam, alteram e excluem tags (elas valem para todos os restaurantes) */
  protected readonly superUsuario = inject(Autenticacao).superUsuario;
  protected readonly tags = this.api.recursoLista();
  protected readonly busca = signal('');
  protected readonly filtradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.tags
      .value()
      .filter(
        (t) =>
          !termo ||
          t.descricaoPT.toLowerCase().includes(termo) ||
          !!t.descricaoEN?.toLowerCase().includes(termo),
      );
  });

  protected async excluir(tag: Tag): Promise<void> {
    const ok = await this.confirmacao.perguntar(
      `Excluir a tag "${tag.descricaoPT}"? Ela será removida de todos os itens que a usam.`,
    );
    if (!ok) return;
    try {
      await this.api.remover(tag.id);
      this.notificacoes.sucesso(`Tag "${tag.descricaoPT}" excluída.`);
      this.tags.reload();
    } catch {
      // erro já exibido pelo interceptor
    }
  }
}
