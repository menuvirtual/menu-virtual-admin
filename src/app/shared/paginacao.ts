import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

/** Paginação simples (no cliente) no estilo do Inspinia. */
@Component({
  selector: 'app-paginacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (paginas() > 1) {
      <nav
        class="d-flex align-items-center justify-content-between px-3 py-2"
        aria-label="Paginação"
      >
        <small class="text-muted"> {{ inicio() + 1 }}–{{ fim() }} de {{ total() }} </small>
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" [class.disabled]="pagina() === 1">
            <button
              type="button"
              class="page-link"
              (click)="pagina.set(pagina() - 1)"
              aria-label="Anterior"
            >
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </li>
          @for (p of numeros(); track p) {
            <li class="page-item" [class.active]="p === pagina()">
              <button type="button" class="page-link" (click)="pagina.set(p)">{{ p }}</button>
            </li>
          }
          <li class="page-item" [class.disabled]="pagina() === paginas()">
            <button
              type="button"
              class="page-link"
              (click)="pagina.set(pagina() + 1)"
              aria-label="Próxima"
            >
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    }
  `,
  styles: `
    .page-link {
      color: inherit;
    }
    .active .page-link {
      background-color: #1ab394;
      border-color: #1ab394;
      color: #fff;
    }
  `,
})
export class Paginacao {
  readonly total = input.required<number>();
  readonly tamanho = input(20);
  readonly pagina = model(1);

  protected readonly paginas = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.tamanho())),
  );
  protected readonly inicio = computed(() => (this.pagina() - 1) * this.tamanho());
  protected readonly fim = computed(() => Math.min(this.total(), this.inicio() + this.tamanho()));
  protected readonly numeros = computed(() => {
    const total = this.paginas();
    const atual = this.pagina();
    const de = Math.max(1, Math.min(atual - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, i) => de + i);
  });
}

/** Fatia a lista na página informada. */
export function paginar<T>(lista: T[], pagina: number, tamanho = 20): T[] {
  return lista.slice((pagina - 1) * tamanho, pagina * tamanho);
}
