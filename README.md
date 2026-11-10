# cuidado+ — Front-end do SGEP

Interface React responsiva para o Sistema de Gestão da Experiência do Paciente. A aplicação contempla a pesquisa pública por setor, a área de Gestão, a Ouvidoria, a configuração de setores e o TV Wall. O React conversa somente com a API do back-end; não acessa o PostgreSQL/Supabase diretamente.

## Requisitos

- Node.js 20.19+ (ou 22.12+) e npm.
- API Express do projeto para uso integrado. Sem `VITE_API_URL`, o front inicia em modo demonstração.

## Executar localmente

```bash
npm install
npm run dev
```

Abra o endereço impresso pelo Vite, normalmente `http://localhost:5173`.

Para executar a demonstração local sem conectar à API, use `npm run dev:demo`.
Ela usa dados fictícios salvos no navegador e não deve receber dados reais de pacientes.

Consulte o [manual de uso e aplicação](./MANUAL-DE-USO-E-APLICACAO.md) para
instruções completas para pacientes, equipe, administração e publicação.

Para validar a versão de entrega:

```bash
npm run lint
npm run build
npm run preview
```

## Demonstração

Sem configurar a API, o sistema usa dados fictícios e persiste as interações no `localStorage` do navegador. Na tela `/gestao/login`, use **Acessar ambiente de demonstração**. O formulário público, as respostas, os indicadores e as manifestações funcionam para apresentação.

> **Atenção:** o modo demonstração não é protegido para dados reais. Não insira informações de pacientes. Antes de usar com o hospital, conecte a API e revise a política de privacidade com o responsável do hospital.

Para zerar os dados de demonstração, abra o console do navegador e execute `localStorage.clear()` e `sessionStorage.clear()`.

## Rotas entregues

| Rota | Tela |
| --- | --- |
| `/` | Página inicial e escolha do setor |
| `/pesquisa/:setor` | Início de pesquisa por link/QR Code |
| `/pesquisa/:setor/pergunta/:etapa?pesquisa=:id` | Pergunta individual e salvamento por etapa |
| `/ouvidoria?pesquisa=:id` | Manifestação associada à pesquisa |
| `/pesquisa/agradecimento` | Confirmação da pesquisa |
| `/gestao/login` | Acesso da equipe |
| `/gestao/dashboard` | Indicadores e exportação; Gestão fica restrita ao próprio setor |
| `/gestao/ouvidoria` | Acompanhamento de manifestações (Ouvidoria e Administrador) |
| `/gestao/ouvidoria/:manifestacaoId` | Detalhes completos de uma manifestação, com quebra segura de texto |
| `/gestao/perguntas` | Criar, editar e desativar perguntas conforme o perfil |
| `/gestao/configuracoes` | Setores e links/QR Codes (Administrador) |
| `/tv-wall` | Indicadores públicos agregados |
| `/privacidade` | Informações de privacidade (texto inicial a validar) |
| `/manual` | Guia rápido para paciente, Gestão, Ouvidoria e TV Wall |

O fluxo do paciente carrega as perguntas ativas do setor na API. A pergunta NPS geral (0–10) é obrigatória; as demais podem usar rostinhos (1–5), NPS ou texto. Cada resposta é salva ao avançar. A API calcula a média de satisfação com as avaliações por rostinhos e decide o encaminhamento: NPS até 6 ou média até 2 leva à Ouvidoria; caso contrário, exibe o agradecimento.

**Decisão pendente no documento:** há conflito entre o corte de nota `≤ 3` em uma decisão e `≤ 2` em outros requisitos. A interface usa `≤ 2`, conforme RF32/RN16. Confirmem o limite final com o hospital e mantenham a regra sincronizada com o back-end.

## Conectar ao back-end

1. Inicie a API em `C:\Users\admin\Downloads\ProjFund_HospOswaldoDiesel_Back` com `npm install` e `npm run dev`. Sem conexão ao banco, ela usa dados em memória para desenvolvimento.
2. Crie `.env.local` no front a partir de `.env.example`, com `VITE_API_URL=/backend` e `VITE_API_PROXY_TARGET=http://localhost:3000`. O proxy encaminha as chamadas sem o prefixo `/backend`.
3. Crie `.env` no back a partir de `ProjFund_HospOswaldoDiesel_Back/.env.example` e configure `CORS_ORIGIN=http://localhost:5173`. Em produção, configure a URL exata do front; `*` não é aceito.
4. Inicie o front com `npm install` e `npm run dev`. Reinicie o Vite após alterar variáveis.
5. Para produção, configure `VITE_API_URL` com a origem HTTPS do back-end; o proxy do Vite só funciona em desenvolvimento.

O adaptador em `src/services/api.ts` converte os contratos entre os projetos. Ele usa `GET /api/setores` e `GET /api/setores/:slug/fluxo`, `POST /api/pesquisas` e `PUT /api/pesquisas/:id/respostas/:perguntaId`, além dos endpoints de login, administração, dashboard, Ouvidoria e TV Wall do back-end. Respostas de pesquisa usam `x-survey-token`; a autenticação da equipe usa `Authorization: Bearer`. A API documenta os contratos em `/docs`.

**Acesso local de demonstração da API:** `super@fundacao.com` / `super123` ou `ouvidoria@fundacao.com` / `ouvidoria123`. Use esses usuários somente no modo de memória local; em produção, crie a conta inicial com `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.

### Contratos usados pelo front

Os DTOs em português do back-end são convertidos no adaptador para os tipos da interface. As pesquisas guardam o token de sessão no `sessionStorage`; falhas de API são exibidas sem troca automática para dados fictícios.

| Método e rota | Autenticação | Corpo / resposta esperada |
| --- | --- | --- |
| `GET /api/setores` | Pública | Setores ativos em português (`id`, `nome`, `slug`, `ativo`) |
| `GET /api/setores/:slug/fluxo` | Pública | Setor e perguntas ativas gerais/do setor com opções |
| `POST /api/pesquisas` | Pública | `{ setor_id, anonimo, consentimento }`; retorna `pesquisa_id` e token privado |
| `PUT /api/pesquisas/:id/respostas/:perguntaId` | Token da pesquisa | `{ pergunta_id, valor }`, `{ pergunta_id, texto }` ou `{ pergunta_id, opcao_id }` |
| `POST /api/pesquisas/:id/finalizar` | Token da pesquisa | Finaliza e retorna `destino` (`ouvidoria` ou `agradecimento`) |
| `POST /api/pesquisas/:id/manifestacoes` | Token da pesquisa | Registra relato e exige consentimento quando há contato |
| `POST /api/auth/login` | Pública | `{ email, senha }`; retorna `{ token, usuario }` |
| `GET /api/dashboard/resumo` e `/api/dashboard/pesquisas` | JWT | Indicadores e registros resumidos; Gestão fica limitada ao setor vinculado |
| `GET /api/manifestacoes`, `PATCH /api/manifestacoes/:id` | JWT | Ouvidoria/Administrador; status usa `aberta`, `em_tratamento` ou `concluida` |
| `GET /api/tvwall` | Pública | Indicadores agregados; suprime métricas por setor abaixo de cinco respostas |
| `GET /api/admin/perguntas`, `POST/PATCH /api/admin/perguntas` | JWT | Perguntas do setor permitido pelo perfil |
| `POST /api/admin/setores` | JWT | Somente Super Admin |

Formatos TypeScript completos: `src/types.ts`. Os filtros de Gestão incluem período, setor, turno, nota e equipe; equipes só são exibidas quando há ao menos cinco respostas no recorte. O token é armazenado em `sessionStorage` e enviado como `Authorization: Bearer <token>` em chamadas protegidas. O controle definitivo de perfil, autorização, consentimento, volume mínimo e acesso a telefone deve ser feito **também no back-end**; esconder campos na interface não substitui autorização de API.

### Perfis e limites de acesso

- **Administrador:** acesso total ao dashboard, setores, perguntas gerais, perguntas de qualquer setor e Ouvidoria.
- **Gestão:** conta vinculada a um setor (`sectorSlug`); pode consultar indicadores e criar, editar ou desativar perguntas somente daquele setor. Não acessa a Ouvidoria.
- **Ouvidoria:** acessa e atualiza somente as manifestações.
- **Visualizador:** consulta somente o dashboard agregado e o TV Wall; não administra perguntas, setores ou manifestações.

No modo de demonstração, a tela `/gestao/login` permite selecionar os três perfis. Em produção, o perfil e o setor devem vir do login da API, não de uma opção escolhida no navegador. A API precisa validar o perfil e o escopo do setor em cada endpoint protegido.

## Publicar no Render

1. Envie o repositório ao GitHub e crie um **Static Site** no Render apontando para a pasta do front.
2. Configure **Build Command** `npm install && npm run build` e **Publish Directory** `dist`.
3. O arquivo `.env.production` já aponta `VITE_API_URL` para `https://projfund-hosposwaldodiesel-back.onrender.com`. Se preferir configurar no painel do Render, use esse mesmo valor na variável de ambiente do Static Site.
4. Adicione uma regra de rewrite `/*` → `/index.html` com status `200` para as rotas do React Router.
5. No serviço do back-end no Render, configure `CORS_ORIGIN` como `https://projeto-hospital-pqxh.onrender.com` (origem do front, sem barra final). Não use a URL do back-end nesse campo.
6. Abra e teste as rotas públicas, a tela de login, o dashboard e `/tv-wall` no link publicado.

## O que falta alinhar/fazer para a entrega

- Para usar PostgreSQL, configure as variáveis do banco no back-end, execute `npm run migrate` e `npm run seed`; configure também `JWT_SECRET`, `CORS_ORIGIN` e as credenciais do administrador inicial.
- Confirmem com o hospital o nome/identidade visual definitiva, o limite de nota da Ouvidoria e a política de retenção e privacidade. O texto em `/privacidade` é apenas um rascunho.
- Validem permissões e acesso a dados pessoais com perfis reais; o back-end precisa proteger cada endpoint com JWT e autorização por perfil.
- O back-end deve associar cada conta de Gestão a um setor e criar contas com os três perfis definidos. A criação e administração de contas continua a cargo da API.
- A escala de trabalho continua sob responsabilidade dos endpoints do back-end.
- `GET /api/tvwall` retorna somente agregados e aplica volume mínimo antes de exibir indicadores por setor.
- Para Excel, o botão exporta CSV UTF-8 separado por ponto e vírgula, compatível com Excel. Para PDF, use **Imprimir → Salvar como PDF** no navegador.
- Publicar o front e o back no Render, confirmar CORS e rotas SPA, validar em celular/tablet e preparar o manual e as telas/mock do Figma solicitados no documento.

## Stack

React, TypeScript, Vite, React Router, Lucide e `qrcode.react`. Dados e login reais são responsabilidade da API própria em Node.js/Express; Supabase/PostgreSQL deve ser acessado somente pelo back-end.
