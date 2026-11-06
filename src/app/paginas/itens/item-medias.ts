import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ItemMediasApi } from '../../core/api';
import { Confirmacao } from '../../core/confirmacao';
import { TIPOS_MEDIA, type ItemMedia, type TipoMedia } from '../../core/modelos';
import { Notificacoes } from '../../core/notificacoes';
import { invalido } from '../../shared/formularios';
import { Ibox } from '../../shared/ibox';

/** Fotos e vídeos de um item (ItemMedia): adicionar, editar, reordenar e excluir. */
@Component({
  selector: 'app-item-medias',
  imports: [ReactiveFormsModule, Ibox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ibox titulo="Fotos e vídeos" [semEspaco]="true">
      <span ibox-titulo class="label label-primary">{{ medias.value().length }}</span>
      <table class="table table-hover">
        <tbody>
          @for (m of medias.value(); track m.id; let primeiro = $first, ultimo = $last) {
            <tr [class.table-active]="editando()?.id === m.id">
              <td class="miniatura">
                @if (m.tipo === 'I') {
                  <a [href]="m.url" target="_blank" rel="noopener"
                    ><img [src]="m.url" alt="" loading="lazy"
                  /></a>
                } @else {
                  <a [href]="m.url" target="_blank" rel="noopener" class="video"
                    ><i class="fa-solid fa-film"></i
                  ></a>
                }
              </td>
              <td>
                <span class="label" [class.label-info]="m.tipo === 'V'">{{ tipos[m.tipo] }}</span>
                <span class="label ms-1">ordem {{ m.ordem }}</span>
                <div class="url">
                  <a [href]="m.url" target="_blank" rel="noopener">{{ m.url }}</a>
                </div>
              </td>
              <td class="acoes">
                <button
                  type="button"
                  class="btn btn-white btn-xs"
                  title="Subir"
                  [disabled]="primeiro || ocupado()"
                  (click)="mover(m, -1)"
                >
                  <i class="fa-solid fa-arrow-up"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-white btn-xs ms-1"
                  title="Descer"
                  [disabled]="ultimo || ocupado()"
                  (click)="mover(m, 1)"
                >
                  <i class="fa-solid fa-arrow-down"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-white btn-xs ms-1"
                  title="Editar"
                  (click)="editar(m)"
                >
                  <i class="fa-solid fa-pencil"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-white btn-xs ms-1 text-danger"
                  title="Excluir"
                  (click)="excluir(m)"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td class="vazio"><i class="fa-regular fa-image"></i> Nenhuma foto ou vídeo.</td>
            </tr>
          }
        </tbody>
      </table>

      <form class="nova p-3 border-top" [formGroup]="form" (ngSubmit)="salvar()" novalidate>
        <div class="row g-2 align-items-start">
          <div class="col-sm-3">
            <label class="form-label" for="tipoMedia">Tipo</label>
            <select id="tipoMedia" class="form-select" formControlName="tipo">
              <option value="I">Imagem</option>
              <option value="V">Vídeo</option>
            </select>
          </div>
          <div class="col-sm-9">
            <label class="form-label" for="urlMedia">URL</label>
            <input
              id="urlMedia"
              type="url"
              class="form-control"
              formControlName="url"
              maxlength="255"
              placeholder="https://..."
              [class.is-invalid]="invalido(form.controls.url)"
            />
            <div class="invalid-feedback">Informe uma URL http(s) (até 255 caracteres).</div>
          </div>
        </div>
        <div class="d-flex justify-content-end gap-2 mt-2">
          @if (editando()) {
            <button type="button" class="btn btn-white btn-sm" (click)="cancelar()">
              Cancelar
            </button>
          }
          <button type="submit" class="btn btn-primary btn-sm" [disabled]="ocupado()">
            <i class="fa-solid" [class]="editando() ? 'fa-check' : 'fa-plus'"></i>
            {{ editando() ? 'Salvar mídia' : 'Adicionar mídia' }}
          </button>
        </div>
      </form>
    </app-ibox>
  `,
  styles: `
    .miniatura {
      width: 80px;
      img,
      .video {
        width: 64px;
        height: 48px;
        object-fit: cover;
        border-radius: 3px;
        border: 1px solid #e7eaec;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f3f4;
        font-size: 20px;
        color: #999;
      }
    }
    .url {
      max-width: 420px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      margin-top: 4px;
    }
  `,
})
export class ItemMedias {
  readonly itemId = input.required<number>();

  private readonly api = inject(ItemMediasApi);
  private readonly confirmacao = inject(Confirmacao);
  private readonly notificacoes = inject(Notificacoes);

  protected readonly tipos = TIPOS_MEDIA;
  protected readonly medias = this.api.recursoLista(() => ({ itemId: this.itemId() }));
  protected readonly editando = signal<ItemMedia | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly invalido = invalido;

  protected readonly form = new FormGroup({
    tipo: new FormControl<TipoMedia>('I', { nonNullable: true }),
    url: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(255),
        Validators.pattern(/^https?:\/\/\S+$/),
      ],
    }),
  });

  protected editar(media: ItemMedia): void {
    this.editando.set(media);
    this.form.reset({ tipo: media.tipo, url: media.url });
  }

  protected cancelar(): void {
    this.editando.set(null);
    this.form.reset();
  }

  protected async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    await this.executar(async () => {
      const dados = this.form.getRawValue();
      const atual = this.editando();
      if (atual) await this.api.atualizar(atual.id, dados);
      else await this.api.criar({ ...dados, itemId: this.itemId() });
      this.notificacoes.sucesso(atual ? 'Mídia alterada.' : 'Mídia adicionada.');
      this.cancelar();
    });
  }

  /** Troca a ordem com a mídia vizinha. */
  protected async mover(media: ItemMedia, direcao: -1 | 1): Promise<void> {
    const lista = this.medias.value();
    const vizinha = lista[lista.indexOf(media) + direcao];
    if (!vizinha) return;
    await this.executar(async () => {
      // se as ordens forem iguais, usa a posição na lista
      const [a, b] =
        media.ordem === vizinha.ordem
          ? [lista.indexOf(vizinha) + 1, lista.indexOf(media) + 1]
          : [vizinha.ordem, media.ordem];
      await this.api.atualizar(media.id, { ordem: a });
      await this.api.atualizar(vizinha.id, { ordem: b });
    });
  }

  protected async excluir(media: ItemMedia): Promise<void> {
    if (
      !(await this.confirmacao.perguntar(`Excluir esta ${TIPOS_MEDIA[media.tipo].toLowerCase()}?`))
    )
      return;
    await this.executar(async () => {
      await this.api.remover(media.id);
      if (this.editando()?.id === media.id) this.cancelar();
      this.notificacoes.sucesso('Mídia excluída.');
    });
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    this.ocupado.set(true);
    try {
      await acao();
    } catch {
      // erro já exibido pelo interceptor
    } finally {
      this.ocupado.set(false);
      this.medias.reload();
    }
  }
}
