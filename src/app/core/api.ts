import { HttpClient, HttpContext, HttpParams, httpResource } from '@angular/common/http';
import { inject, Injectable, type Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api-url';
import { SEM_NOTIFICACAO } from './interceptor-erros';
import type {
  Categoria,
  Cliente,
  ConfiguracaoMenu,
  Item,
  ItemMedia,
  Menu,
  Restaurante,
  Resumo,
  SubCategoria,
  Tag,
} from './modelos';

/** Parâmetros de filtro das listagens; valores vazios são ignorados. */
export type Filtro = Record<string, string | number | null | undefined>;

/**
 * Acesso a um recurso CRUD da API (/admin/<caminho>).
 * Listagens reativas usam httpResource; gravações usam Promises.
 */
export abstract class RecursoApi<T extends { id: number }> {
  protected readonly http = inject(HttpClient);
  protected readonly base: string;

  protected constructor(caminho: string) {
    this.base = `${inject(API_URL)}/admin/${caminho}`;
  }

  /**
   * Lista reativa: refaz a consulta quando o filtro muda.
   * Se o filtro devolver null, não consulta (lista vazia).
   */
  recursoLista(filtro: () => Filtro | null = () => ({})) {
    return httpResource<T[]>(
      () => {
        const f = filtro();
        return f === null ? undefined : { url: this.base, params: parametros(f) };
      },
      { defaultValue: [] },
    );
  }

  /** Registro reativo pelo id (null = não consulta). */
  recursoItem(id: Signal<number | null>) {
    return httpResource<T>(() => {
      const valor = id();
      return valor === null ? undefined : `${this.base}/${valor}`;
    });
  }

  listar(filtro: Filtro = {}): Promise<T[]> {
    return firstValueFrom(this.http.get<T[]>(this.base, { params: parametros(filtro) }));
  }

  /** Busca pelo id. Com `silencioso`, um erro não gera notificação (quem chamou trata). */
  obter(id: number, { silencioso = false } = {}): Promise<T> {
    return firstValueFrom(
      this.http.get<T>(`${this.base}/${id}`, {
        context: new HttpContext().set(SEM_NOTIFICACAO, silencioso),
      }),
    );
  }

  criar(dados: object): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.base, dados));
  }

  atualizar(id: number, dados: object): Promise<T> {
    return firstValueFrom(this.http.patch<T>(`${this.base}/${id}`, dados));
  }

  remover(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }
}

function parametros(filtro: Filtro): HttpParams {
  let params = new HttpParams();
  for (const [chave, valor] of Object.entries(filtro))
    if (valor !== null && valor !== undefined && valor !== '')
      params = params.set(chave, String(valor));
  return params;
}

@Injectable({ providedIn: 'root' })
export class RestaurantesApi extends RecursoApi<Restaurante> {
  constructor() {
    super('restaurantes');
  }
}

@Injectable({ providedIn: 'root' })
export class MenusApi extends RecursoApi<Menu> {
  constructor() {
    super('menus');
  }

  /** Copia o preview para a versão publicada (409 se não houver atualizações). */
  publicar(id: number): Promise<Menu> {
    return firstValueFrom(this.http.post<Menu>(`${this.base}/${id}/publicar`, {}));
  }
}

@Injectable({ providedIn: 'root' })
export class ConfiguracoesMenuApi extends RecursoApi<ConfiguracaoMenu> {
  constructor() {
    super('configuracoes-menu');
  }
}

@Injectable({ providedIn: 'root' })
export class CategoriasApi extends RecursoApi<Categoria> {
  constructor() {
    super('categorias');
  }
}

@Injectable({ providedIn: 'root' })
export class SubCategoriasApi extends RecursoApi<SubCategoria> {
  constructor() {
    super('subcategorias');
  }
}

@Injectable({ providedIn: 'root' })
export class ItensApi extends RecursoApi<Item> {
  constructor() {
    super('itens');
  }
}

@Injectable({ providedIn: 'root' })
export class ItemMediasApi extends RecursoApi<ItemMedia> {
  constructor() {
    super('item-medias');
  }
}

@Injectable({ providedIn: 'root' })
export class ClientesApi extends RecursoApi<Cliente> {
  constructor() {
    super('clientes');
  }
}

@Injectable({ providedIn: 'root' })
export class TagsApi extends RecursoApi<Tag> {
  constructor() {
    super('tags');
  }
}

@Injectable({ providedIn: 'root' })
export class ResumoApi {
  private readonly url = `${inject(API_URL)}/admin/resumo`;

  /** Totais de todos os restaurantes ou, com restauranteId, só de um. */
  recurso(restauranteId: () => number | null = () => null) {
    return httpResource<Resumo>(() => {
      const id = restauranteId();
      return { url: this.url, params: parametros({ restauranteId: id }) };
    });
  }
}
