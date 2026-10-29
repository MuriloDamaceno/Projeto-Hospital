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

O fluxo do paciente carrega as perguntas ativas do setor na API. A primeira avaliação geral por rostinhos (1–5) é obrigatória; novas perguntas podem ser opcionais e usar rostinhos, NPS (0–10) ou texto. Cada resposta é salva ao avançar; perguntas desativadas não aparecem em pesquisas novas. A média de satisfação usa somente perguntas de rostinhos. Média parcial de até 2 leva à Ouvidoria; caso contrário, é exibido o agradecimento.

**Decisão pendente no documento:** há conflito entre o corte de nota `≤ 3` em uma decisão e `≤ 2` em outros requisitos. A interface usa `≤ 2`, conforme RF32/RN16. Confirmem o limite final com o hospital e mantenham a regra sincronizada com o back-end.

## Conectar ao back-end

1. Inicie o back-end Express e disponibilize os endpoints da tabela abaixo (ou alinhe os caminhos/contratos com o colega e ajuste `src/services/api.ts`).
2. Crie `.env.local` na raiz a partir de `.env.example`.
3. Configure `VITE_API_URL` com a origem da API, sem barra final, por exemplo `http://localhost:3000`.
4. Reinicie o Vite depois de alterar as variáveis.
5. Configure CORS no Express para aceitar a origem do front local e a URL publicada no Render.

### Contrato esperado pelo front

As respostas são JSON em camelCase. Respostas `4xx`/`5xx` são exibidas na tela; o front não troca silenciosamente para dados fictícios se a API falhar.

| Método e rota | Autenticação | Corpo / resposta esperada |
| --- | --- | --- |
| `GET /api/v1/setores` | Pública | `Department[]`: `{ id, name, slug, description, icon, active }` |
| `GET /api/v1/perguntas?setor=:slug` | Pública | Perguntas ativas gerais e do setor, ordenadas por `required`/`order`; cada uma retorna `{ id, text, type, required, active, order, sectorSlug, answerKey }` |
| `GET /api/v1/perguntas?setor=:slug&inativas=true` | JWT | Perguntas do setor; somente Gestão do setor e Administrador |
| `GET /api/v1/perguntas?escopo=geral&inativas=true` | JWT | Perguntas gerais; somente Administrador |
| `POST /api/v1/perguntas` | JWT | Corpo `{ text, type, required, sectorSlug }`; Gestão só pode usar seu `sectorSlug`; Administrador pode usar `null` (geral) ou qualquer setor |
| `PATCH /api/v1/perguntas/:id` | JWT | Corpo `{ text?, active? }`; respeita o mesmo escopo. A pergunta geral obrigatória não pode ser desativada |
| `POST /api/v1/pesquisas` | Pública | Corpo `{ sectorSlug }`; retorna um `SurveyRecord` com `id` |
| `POST /api/v1/pesquisas/:id/respostas` | Pública | Corpo `{ perguntaId, valor }`; salva atomicamente e retorna o `SurveyRecord` atualizado |
| `POST /api/v1/pesquisas/:id/finalizar` | Pública | Finaliza e retorna `SurveyRecord` com média e estado de conclusão |
| `POST /api/v1/pesquisas/:id/manifestacoes` | Pública | Corpo `{ surveyId, sectorSlug, type, description, anonymous, contact? }`; retorna `Manifestation` |
| `POST /api/v1/auth/login` | Pública | Corpo `{ email, senha }`; retorna `{ token, user: { name, email, role, sectorSlug? } }`; `role` é `Administrador`, `Gestão` ou `Ouvidoria` |
| `GET /api/v1/dashboard/resumo` | JWT | Administrador: dados de todos os setores e contagens/manifestações autorizadas; Gestão: somente o próprio setor e contagens de Ouvidoria, sem texto/telefone; Ouvidoria: usar apenas os dados necessários à sua caixa |
| `GET /api/v1/tv-wall/resumo` | Pública | Somente `{ responseCount, satisfactionAverage, nps, complimentCount, sectors: [{ sectorSlug, responseCount, satisfactionAverage }] }`; o back-end só deve incluir setores que cumpram o volume mínimo |
| `GET /api/v1/manifestacoes` | JWT | Somente Ouvidoria e Administrador |
| `PATCH /api/v1/manifestacoes/:id` | JWT | Somente Ouvidoria e Administrador; corpo `{ status }`; retorna `204` ou JSON |
| `POST /api/v1/setores` | JWT | Somente Administrador; corpo `{ name, slug, description }`; retorna o setor criado |

Formatos TypeScript completos: `src/types.ts`. Os filtros de Gestão incluem período, setor, turno, nota e equipe; equipes só são exibidas quando há ao menos cinco respostas no recorte. O token é armazenado em `sessionStorage` e enviado como `Authorization: Bearer <token>` em chamadas protegidas. O controle definitivo de perfil, autorização, consentimento, volume mínimo e acesso a telefone deve ser feito **também no back-end**; esconder campos na interface não substitui autorização de API.

### Perfis e limites de acesso

- **Administrador:** acesso total ao dashboard, setores, perguntas gerais, perguntas de qualquer setor e Ouvidoria.
- **Gestão:** conta vinculada a um setor (`sectorSlug`); pode consultar indicadores e criar, editar ou desativar perguntas somente daquele setor. Não acessa a Ouvidoria.
- **Ouvidoria:** acessa e atualiza somente as manifestações.

No modo de demonstração, a tela `/gestao/login` permite selecionar os três perfis. Em produção, o perfil e o setor devem vir do login da API, não de uma opção escolhida no navegador. A API precisa validar o perfil e o escopo do setor em cada endpoint protegido.

Os endpoints de perguntas esperados pelo adaptador são `GET /api/v1/perguntas?setor=:slug` (perguntas ativas para a pesquisa), `GET /api/v1/perguntas?setor=:slug&inativas=true`, `GET /api/v1/perguntas?escopo=geral&inativas=true`, `POST /api/v1/perguntas` com `{ text, type, required, sectorSlug }` e `PATCH /api/v1/perguntas/:id` com `{ text?, active? }`. Tipos permitidos: `rostinho`, `nps` e `texto`. A pergunta geral obrigatória não pode ser desativada. Consulte `src/types.ts` e `src/services/api.ts` para os formatos completos.

## Publicar no Render

1. Envie o repositório ao GitHub e crie um **Static Site** no Render apontando para a pasta do front.
2. Configure **Build Command** `npm install && npm run build` e **Publish Directory** `dist`.
3. Adicione a variável de ambiente `VITE_API_URL` com a URL HTTPS do back-end.
4. Adicione uma regra de rewrite `/*` → `/index.html` com status `200` para as rotas do React Router.
5. Inclua a URL final do front na lista de origens CORS do back-end.
6. Abra e teste as rotas públicas, a tela de login, o dashboard e `/tv-wall` no link publicado.

## O que falta alinhar/fazer para a entrega

- Seu colega deve implementar os endpoints e formatos acima (ou atualizar o adaptador `src/services/api.ts` para os contratos finais da API).
- Confirmem com o hospital o nome/identidade visual definitiva, o limite de nota da Ouvidoria e a política de retenção e privacidade. O texto em `/privacidade` é apenas um rascunho.
- Validem permissões e acesso a dados pessoais com perfis reais; o back-end precisa proteger cada endpoint com JWT e autorização por perfil.
- O back-end deve associar cada conta de Gestão a um setor e criar contas com os três perfis definidos. A criação e administração de contas continua a cargo da API.
- Implementem os endpoints de perguntas e autorizem no back-end a Gestão somente para o próprio setor. A escala de trabalho ainda depende dos endpoints do back-end.
- `GET /api/v1/tv-wall/resumo` deve retornar somente agregados; não reutilize no painel público os dados detalhados do dashboard.
- Para Excel, o botão exporta CSV UTF-8 separado por ponto e vírgula, compatível com Excel. Para PDF, use **Imprimir → Salvar como PDF** no navegador.
- Publicar o front e o back no Render, confirmar CORS e rotas SPA, validar em celular/tablet e preparar o manual e as telas/mock do Figma solicitados no documento.

## Stack

React, TypeScript, Vite, React Router, Lucide e `qrcode.react`. Dados e login reais são responsabilidade da API própria em Node.js/Express; Supabase/PostgreSQL deve ser acessado somente pelo back-end.
