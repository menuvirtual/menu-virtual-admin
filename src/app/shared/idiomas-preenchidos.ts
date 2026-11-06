import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IDIOMAS, NOMES_IDIOMAS } from '../core/modelos';

/** Siglas dos idiomas preenchidos de um campo traduzido (ex.: PT EN ES). */
@Component({
  selector: 'app-idiomas-preenchidos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (i of idiomas(); track i.sigla) {
      <span class="sigla" [class.preenchido]="i.preenchido" [title]="i.titulo">{{ i.sigla }}</span>
    }
  `,
  styles: `
    .sigla {
      display: inline-block;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 4px;
      margin-right: 2px;
      border-radius: 2px;
      color: #c4c4c4;
      border: 1px solid #e7eaec;
    }
    .preenchido {
      color: #1ab394;
      border-color: #1ab394;
    }
  `,
})
export class IdiomasPreenchidos {
  readonly entidade = input.required<object>();
  readonly prefixo = input('descricao');

  protected readonly idiomas = computed(() => {
    const dados = this.entidade() as Record<string, unknown>;
    return IDIOMAS.map((sigla) => {
      const preenchido = !!dados[`${this.prefixo()}${sigla}`];
      return {
        sigla,
        preenchido,
        titulo: `${NOMES_IDIOMAS[sigla]}: ${preenchido ? 'traduzido' : 'sem tradução'}`,
      };
    });
  });
}
