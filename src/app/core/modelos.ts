/*
 * Modelos da Menu API (rotas /admin/...). Espelham as entidades do BackEnd.
 */

/** Siglas dos idiomas, na ordem exibida no admin */
export const IDIOMAS = ['PT', 'EN', 'ES', 'FR', 'PL', 'DE'] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const NOMES_IDIOMAS: Record<Idioma, string> = {
  PT: 'Português',
  EN: 'Inglês',
  ES: 'Espanhol',
  FR: 'Francês',
  PL: 'Polonês',
  DE: 'Alemão',
};

/** Campos traduzidos: descricaoPT, descricaoEN... / nomePT, nomeEN... */
export type Traduzido<P extends string> = { [I in Idioma as `${P}${I}`]: string | null };

export interface Restaurante {
  id: number;
  nome: string;
  slug: string;
}

/** Usuário logado (GET /admin/eu) */
export interface Perfil {
  usuario: string;
  /** Acessa todos os restaurantes; pode cadastrar/excluir restaurantes e editar tags */
  superUsuario: boolean;
  /** Restaurantes que pode administrar */
  restaurantes: Restaurante[];
}

export interface Menu {
  id: number;
  /** Identificador do menu no admin (ex.: "Menu dia"); não aparece no cardápio */
  nome: string;
  restauranteId: number;
  isAtivo: boolean;
  /** O preview tem mudanças ainda não publicadas (liga a cada escrita no menu; "Publicar" desliga) */
  contemAtualizacaoParaPublicar: boolean;
  /** Versão publicada (GET /menu). Só leitura; só vem no GET /admin/menus/:id */
  payload?: Record<string, unknown>;
  /** Versão de pré-visualização (GET /menu?preview=true). Gerada pela API; só leitura; só vem no GET /admin/menus/:id */
  payloadPreview?: Record<string, unknown>;
  restaurante?: Restaurante;
}

export interface ConfiguracaoMenu {
  id: number;
  menuId: number;
  habilitaPT: boolean;
  habilitaEN: boolean;
  habilitaES: boolean;
  habilitaFR: boolean;
  habilitaPL: boolean;
  habilitaDE: boolean;
  habilitaPesquisaCliente: boolean;
  habilitaPesquisaClienteNome: boolean;
  habilitaPesquisaClienteDataNiver: boolean;
  habilitaPesquisaClienteEmail: boolean;
  habilitaPesquisaClientePhone: boolean;
}

export interface Categoria extends Traduzido<'descricao'> {
  id: number;
  menuId: number;
  ordem: number;
  descricaoPT: string;
}

export interface SubCategoria extends Traduzido<'descricao'> {
  id: number;
  categoriaId: number;
  ordem: number;
  descricaoPT: string;
}

export interface Tag extends Traduzido<'descricao'> {
  id: number;
  descricaoPT: string;
  /** true = aparece na lista de filtros do cardápio */
  visibleLista: boolean;
}

export interface Item extends Traduzido<'nome'>, Traduzido<'descricao'> {
  id: number;
  subCategoriaId: number;
  ordem: number;
  nomePT: string;
  visivel: boolean;
  tags: Tag[];
}

export const TIPOS_MEDIA = { I: 'Imagem', V: 'Vídeo' } as const;
export type TipoMedia = keyof typeof TIPOS_MEDIA;

export interface ItemMedia {
  id: number;
  itemId: number;
  tipo: TipoMedia;
  url: string;
  ordem: number;
}

export interface Cliente {
  id: number;
  restauranteId: number;
  nome: string;
  /** AAAA-MM-DD */
  dataNascimento: string | null;
  email: string | null;
  phone: string | null;
}

export interface ResumoRestaurante {
  id: number;
  nome: string;
  slug: string;
  menus: number;
  menuAtivoId: number | null;
  clientes: number;
}

export interface Resumo {
  restaurantes: number;
  menus: number;
  categorias: number;
  subCategorias: number;
  itens: number;
  itensOcultos: number;
  clientes: number;
  tags: number;
  porRestaurante: ResumoRestaurante[];
}

/** Rótulo de um menu nos seletores: "Menu noite · Ativo" */
export function rotuloMenu(menu: Pick<Menu, 'nome' | 'isAtivo'>): string {
  return `${menu.nome} · ${situacaoMenu(menu)}`;
}

export function situacaoMenu(menu: Pick<Menu, 'isAtivo'>): string {
  return menu.isAtivo ? 'Ativo' : 'Inativo';
}
