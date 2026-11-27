# SGEP - Front-end

Interface web do Sistema de Gestão da Experiência do Paciente (SGEP), construída
com React, TypeScript e Vite.

## Ambiente publicado

| Serviço | URL |
| --- | --- |
| Front-end | `https://projeto-hospital-pqxh.onrender.com` |
| Back-end | `https://projfund-hosposwaldodiesel-back.onrender.com` |
| OpenAPI | `https://projfund-hosposwaldodiesel-back.onrender.com/docs` |
| Health check | `https://projfund-hosposwaldodiesel-back.onrender.com/health` |

As URLs podem mudar somente se o serviço for recriado no Render. Quando isso
acontecer, atualize `.env.production` e o `CORS_ORIGIN` do back-end.

## Configuração da API

O projeto usa `VITE_API_URL` para o endereço completo da API.

Arquivo `.env.production`:

```text
VITE_API_URL=https://projfund-hosposwaldodiesel-back.onrender.com
```

O back-end já deve aceitar o front-end publicado em `CORS_ORIGIN`:

```text
CORS_ORIGIN=https://projeto-hospital-pqxh.onrender.com
```

Não coloque barra final em `CORS_ORIGIN`.

## Publicação no Render

1. Crie um **Static Site** no Render.
2. Selecione o repositório do front-end.
3. Configure:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. Configure a variável:
   - `VITE_API_URL=https://projfund-hosposwaldodiesel-back.onrender.com`
5. Configure a regra de rewrite do SPA:
   - Source: `/*`
   - Destination: `/index.html`
   - Status: `200`
6. Faça o deploy e confirme o health check do back-end.

O projeto também inclui `render.yaml` e `public/_redirects` para auxiliar o
roteamento do React Router.

`VITE_API_URL` é incorporada durante o build. Depois de alterar essa variável no
Render, é necessário iniciar um novo deploy do front.

## Instalação e validação

```bash
npm install
npm run lint
npm run build
npm run preview
```

O preview local deve ser usado apenas para validar a versão compilada.

## Desenvolvimento local opcional

Para desenvolvimento:

```bash
npm install
npm run dev
```

Acesse o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

Para apontar o front local para o back-end publicado:

```text
VITE_API_URL=https://projfund-hosposwaldodiesel-back.onrender.com
```

Para apontar para uma API local:

```text
VITE_API_URL=/backend
VITE_API_PROXY_TARGET=http://localhost:3000
```

Nesse caso, o proxy do Vite encaminha `/backend` para a API local e remove o
prefixo antes da requisição.

## Principais rotas

| Rota | Finalidade |
| --- | --- |
| `/` | Página inicial e escolha do setor |
| `/pesquisa/:setor` | Pesquisa pública por setor |
| `/ouvidoria` | Manifestação associada à pesquisa |
| `/pesquisa/agradecimento` | Confirmação da pesquisa |
| `/gestao/login` | Login da equipe |
| `/gestao/dashboard` | Indicadores e relatórios |
| `/gestao/ouvidoria` | Gestão de manifestações |
| `/gestao/perguntas` | Administração de perguntas |
| `/gestao/configuracoes` | Setores e links/QR Codes |
| `/tv-wall` | Indicadores agregados |
| `/privacidade` | Informações de privacidade |
| `/manual` | Manual de uso |

O React Router precisa de rewrite para SPA no hospedador; sem essa regra,
atualizar uma URL como `/pesquisa/cardiologia` pode retornar 404.

## Integração com a API

O adaptador em `src/services/api.ts` centraliza as chamadas HTTP.

- `GET /api/setores`
- `GET /api/setores/:slug/fluxo`
- `POST /api/pesquisas`
- `PUT /api/pesquisas/:id/respostas/:perguntaId`
- `POST /api/pesquisas/:id/finalizar`
- `POST /api/pesquisas/:id/manifestacoes`
- `POST /api/auth/login`
- `GET /api/dashboard/resumo`
- `GET /api/dashboard/pesquisas`
- `GET /api/manifestacoes`
- `PATCH /api/manifestacoes/:id`
- `GET /api/tvwall`
- `GET /api/admin/perguntas`
- `POST /api/admin/perguntas`
- `PATCH /api/admin/perguntas/:id`
- `POST /api/admin/setores`

Chamadas administrativas enviam `Authorization: Bearer <JWT>`. Chamadas da
pesquisa enviam `x-survey-token`. Esses contratos devem ser considerados
válidos também pelo back-end; ocultar uma opção no front não concede autorização.

## Perfis

- **Administrador:** setores, perguntas, dashboard e Ouvidoria.
- **Gestão:** dashboard e perguntas vinculados ao próprio setor.
- **Ouvidoria:** consultas e atualização de manifestações.
- **Visualizador:** dashboard agregado e TV Wall.

Os perfis usados pela interface devem ser devolvidos pelo login da API. O
front-end não deve ser a única camada de autorização.

## Privacidade e demonstração

Não use dados reais em um ambiente local ou de demonstração. Dados reais devem
passar pela API publicada, banco PostgreSQL e políticas de privacidade aprovadas
pela instituição.

Contas de demonstração não são contas válidas no banco de produção. Para criar
o administrador inicial, use o seed seguro do back-end.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- Lucide React
- `qrcode.react`

## Repositórios relacionados

- Front-end: `C:\Users\admin\Downloads\Projeto-Hospital`
- Back-end: `C:\Users\admin\Downloads\ProjFund_HospOswaldoDiesel_Back`
