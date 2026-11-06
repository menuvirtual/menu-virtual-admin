# Menu Admin (Angular)

Painel administrativo do cardápio virtual. Consome a Menu API (`../BackEnd`, rotas `/admin/...`).
Visual baseado no tema [INSPINIA](https://chuibility.github.io/inspinia/): mesmas cores (verde
`#1ab394`, sidebar `#2f4050`, fundo `#f3f3f4`...) e fonte (Open Sans).

- Angular 22 (versão `next`: `22.3.0-next`), componentes standalone, sem zone.js, signals e `httpResource`
- Bootstrap 5.3 (com a paleta do Inspinia), Font Awesome e Open Sans (instalados via npm; não usa CDN)
- Login com os usuários do Cognito (via API) (captcha ALTCHA temporariamente desativado)

```bash
# API rodando em http://localhost:3000 (ver ../BackEnd/README.md: npm run dev:setup + start:dev)
npm install
npm start                  # http://localhost:4200
npm test                   # testes unitários (Vitest)
npm run build              # build de produção em dist/menu-admin
```

O endereço da API fica em `src/app/core/api-url.ts` (padrão `http://localhost:3000`).

## Login

`/login` (estilo da página de login do Inspinia): usuário, senha (captcha temporariamente desativado). Também
cobre o primeiro acesso (trocar a senha temporária) e o "esqueci minha senha" (código por e-mail; no
cognito-local o código aparece em `docker logs menu-api-cognito`).

Usuários de teste (senha `Menu@12345`): `USER1` (casa-lusitana e chapa-quente), `USER2` (casa-italiana)
e `SUPERUSER` (todos).

- O admin fala só com a API (`/auth/...`); o access token vai em toda chamada ao `/admin` como
  `Authorization: Bearer` e é renovado automaticamente (antes de vencer ou ao receber 401). Sem
  renovação possível, volta para o login.
- A sessão fica no `localStorage` (sobrevive ao recarregar a página). "Sair" na barra superior.
- O código do captcha está comentado e preservado para retomada.

## Escolha do restaurante

Depois do login:

- quem administra **um só restaurante** entra direto nele (sem tela de seleção e sem "Trocar restaurante");
- quem administra **vários** escolhe em `/selecionar-restaurante` a cada login;
- o **superusuário** vê todos os restaurantes nessa tela e é o único que cadastra novos.

A escolha fica lembrada (por usuário) para recarregar a página sem escolher de novo, e todas as telas
trabalham só com aquele restaurante. Para trocar: "Trocar restaurante" na barra superior ou na sidebar.

Permissões só de superusuário: cadastrar/excluir restaurantes e criar/alterar/excluir tags (para os
demais, a tela de Tags é só leitura).

## Telas

| Menu | Rota | O que faz |
|------|------|-----------|
| Dashboard | `/` | totais do restaurante, menu ativo (com links para o JSON publicado e o de preview, e aviso se há atualizações para publicar) e lista de menus |
| Menus | `/menus` | CRUD; cada menu tem um **nome** (ex.: "Menu dia", "Menu noite"), usado só para identificá-lo no admin: aparece na lista, nos seletores, no dashboard e nas mensagens, mas não no cardápio. "Ativar" torna o menu o ativo. A coluna **Atualizações** mostra "Para publicar" quando o preview tem mudanças, e o botão **Publicar** (só aparece nesse caso) copia o preview para a versão publicada. No detalhe: abas **Dados e JSON**, **Configuração** e **Estrutura** (árvore categorias > subcategorias > itens). O JSON (Publicado / Preview) é **somente leitura**: o preview é gerado pela API a cada alteração no cardápio |
| Cardápio › Categorias | `/categorias` | CRUD com descrição nos 6 idiomas |
| Cardápio › Subcategorias | `/subcategorias` | CRUD |
| Cardápio › Itens | `/itens` | CRUD com nome/descrição nos 6 idiomas, tags, visibilidade e fotos/vídeos (ItemMedia) |
| Clientes | `/clientes` | CRUD com busca por nome, e-mail ou telefone |
| Tags | `/tags` | CRUD (superusuário); as tags são compartilhadas por todos os restaurantes |
| Configuração | `/configuracao` | dados do restaurante (nome e slug), configuração de cada menu (idiomas e pesquisa do cliente) e exclusão do restaurante (superusuário) |

As listas do cardápio filtram em cascata (Menu > Categoria > Subcategoria), começam pelo menu ativo e
guardam os filtros na URL (ex.: `/itens?menuId=9`), então os links entre telas já abrem filtrados.
Registros de outro restaurante (ex.: link antigo) não podem ser editados.

## Estrutura

```
src/
  styles.scss               Bootstrap configurado com a paleta do Inspinia
  styles/_paleta.scss       cores e fonte do Inspinia
  styles/_inspinia.scss     layout (sidebar, barra superior, page-heading, ibox, widgets...)
  app/
    core/                   API (um serviço por recurso), autenticação + interceptor do token,
                            restaurante atual + guards, modelos,
                            notificações, confirmação, interceptor de erros
    layout/                 sidebar + barra superior + rodapé
    shared/                 componentes reutilizados (ibox, título da página, campos em 6 idiomas,
                            seletor em cascata do cardápio, paginação...)
    paginas/<entidade>/     lista e formulário de cada entidade
```
