# Manual de uso e aplicação — cuidado+

**Sistema de Gestão da Experiência do Paciente (SGEP)**  
Fundação Hospitalar Dr. Oswaldo Diesel

## 1. Objetivo

O cuidado+ permite que pacientes e acompanhantes avaliem a experiência de
atendimento por setor. A equipe autorizada acompanha indicadores, gerencia
perguntas e trata manifestações da Ouvidoria. O TV Wall apresenta resultados
agregados para comunicação interna.

Este manual orienta o uso das telas e descreve os requisitos para executar,
configurar e publicar a aplicação. A implantação com dados reais deve ser
validada e autorizada pela instituição.

## 2. Endereços do projeto

| Recurso | Endereço |
| --- | --- |
| Aplicação publicada | [projeto-hospital-pqxh.onrender.com](https://projeto-hospital-pqxh.onrender.com) |
| Verificação de saúde da API | [API `/health`](https://projfund-hosposwaldodiesel-back.onrender.com/health) |
| Documentação da API | [API `/docs`](https://projfund-hosposwaldodiesel-back.onrender.com/docs) |
| Projeto do banco no Supabase | [Painel Supabase](https://supabase.com/dashboard/project/oxtoqgtxjiyoztbktkft) |
| Serviço do back-end no Render | [Painel e deploys do back-end](https://dashboard.render.com/web/srv-dbg914navr4c73dc8ji0/deploys/dep-dbmq8oc9v7es73afmhtg) |
| Serviço do front-end no Render | [Painel e deploys do front-end](https://dashboard.render.com/static/srv-dbmpo5e7bikc73bmnh00/deploys/dep-dbmpuolg1s2s73d8o6c0) |

Os painéis de hospedagem e banco exigem uma conta autorizada. Não compartilhe
senhas, tokens, `DATABASE_URL` ou valores de variáveis secretas.

## 3. Visão geral da aplicação

O sistema é composto por três partes:

1. **Front-end:** interface React/TypeScript compilada pelo Vite e publicada
   como site estático no Render.
2. **Back-end:** API Node.js/Express hospedada no Render; valida solicitações,
   autentica a equipe e aplica regras de acesso.
3. **Banco:** PostgreSQL hospedado no Supabase. O navegador não se conecta
   diretamente ao banco; apenas a API tem acesso às credenciais.

O front-end e a API comunicam-se por HTTPS. Respostas da pesquisa são
vinculadas a um token de sessão; as operações da equipe usam autenticação JWT.

## 4. Como usar — pacientes e acompanhantes

### 4.1 Iniciar uma pesquisa

1. Abra a [aplicação publicada](https://projeto-hospital-pqxh.onrender.com) ou
   leia o QR Code disponibilizado pelo setor.
2. Na página inicial, escolha o setor em que recebeu atendimento.
3. Responda à pergunta geral obrigatória de recomendação, com uma nota de 0 a
   10. A pergunta não pode ser ignorada.
4. Responda às perguntas adicionais exibidas para aquele setor. Perguntas
   opcionais podem ser respondidas ou puladas.
5. Use **Continuar** para salvar cada resposta e avançar.
6. Ao terminar, a aplicação agradece ou oferece o formulário da Ouvidoria,
   conforme as regras de encaminhamento configuradas na API.

Se a pesquisa for interrompida, retorne ao início para começar outra. Não
inclua nome, telefone, prontuário ou outros dados pessoais em respostas
abertas, a menos que seja necessário e autorizado.

### 4.2 Registrar uma manifestação na Ouvidoria

1. Quando o formulário for oferecido, escolha se a mensagem é elogio,
   reclamação ou sugestão.
2. Selecione o setor relacionado e descreva o ocorrido.
3. A manifestação pode ser anônima. Se desejar retorno, marque a opção de
   contato e forneça os dados solicitados; o envio de contato depende do
   consentimento apresentado no formulário.
4. Selecione **Enviar para a Ouvidoria** e aguarde a confirmação.

O sistema não promete retorno automático. Para acompanhar o resultado, entre
em contato diretamente com a Ouvidoria pelos canais oficiais do hospital.

## 5. Como usar — equipe

### 5.1 Entrar e sair

1. Abra **Acesso da equipe** na página inicial.
2. Informe o e-mail e a senha da conta fornecida pela administração.
3. Para encerrar, use **Sair** no menu da área de gestão.

Em produção, a conta, o perfil e o setor associado devem ser cadastrados e
administrados pela instituição. As credenciais de demonstração são apenas
locais e **não devem ser usadas em produção**.

### 5.2 Perfis e permissões

| Perfil | Permissões principais |
| --- | --- |
| Administrador | Consulta o painel, administra setores e perguntas e acessa a Ouvidoria. |
| Gestão | Consulta indicadores e administra perguntas dentro do setor vinculado à conta. |
| Ouvidoria | Consulta manifestações autorizadas e atualiza seu andamento. |
| Visualizador | Consulta indicadores agregados e o TV Wall; não administra cadastros nem manifestações. |

As permissões efetivas são validadas pela API. Se uma tela não aparecer ou
uma ação for recusada, confirme com o administrador se a conta tem o perfil e
o setor corretos.

### 5.3 Painel de indicadores

1. Abra **Visão geral**.
2. Selecione período, setor, turno, faixa de nota ou equipe, quando disponíveis
   para o seu perfil.
3. Use **Atualizar** para buscar os dados novamente.
4. Use **Exportar Excel** para obter o relatório compatível com planilhas. O
   arquivo exportado é CSV; abra-o no Excel ou em uma planilha compatível.
5. Para guardar uma cópia em PDF, use a função de impressão do navegador e
   selecione **Salvar como PDF**, se disponível.

Resultados de equipe podem ser ocultados quando a quantidade de respostas do
recorte for inferior ao limite de privacidade configurado.

### 5.4 Perguntas

1. Abra **Perguntas** e escolha o escopo: perguntas gerais ou um setor.
2. Para criar uma pergunta de setor, preencha o texto e escolha o formato
   disponível.
3. Use **Adicionar pergunta** para salvá-la.
4. Use **Editar** para alterar uma pergunta permitida pelo seu perfil.
5. Use **Ativa/Desativada** para controlar se a pergunta aparece em novas
   pesquisas.

A pergunta geral obrigatória de NPS é protegida pela aplicação. Perguntas
gerais ou de outros setores podem exigir acesso de Administrador.

### 5.5 Setores e QR Codes

1. Abra **Configurações** com uma conta Administradora.
2. Consulte os setores e seus endereços de pesquisa.
3. Para cadastrar um setor, preencha nome e descrição e selecione **Adicionar**.
4. Use o QR Code ou o link do setor para divulgar a pesquisa.

Antes de divulgar um QR Code, teste o endereço em um celular e confirme que
ele abre o setor correto.

### 5.6 Ouvidoria

1. Abra **Ouvidoria** para ver as manifestações permitidas para a conta.
2. Filtre por status, se necessário.
3. Abra uma manifestação para consultar o relato e as informações de contato
   autorizadas.
4. Atualize o status conforme o procedimento da instituição: aberta, em
   tratamento ou concluída.

Trate os relatos e contatos como dados confidenciais. Não copie informações
pessoais para canais não autorizados.

### 5.7 TV Wall

Abra **TV Wall** pelo menu da equipe ou em `/tv-wall`. Use **Tela cheia** para
exibição em monitor e **Atualizar painel** para buscar os indicadores. O painel
atualiza os dados periodicamente e mostra somente resultados agregados. Os
indicadores por setor podem ficar ocultos até atingir o mínimo de respostas
definido para proteger a privacidade.

## 6. Aplicação e configuração técnica

### 6.1 Requisitos

- Node.js 20.19+ ou 22.12+ e npm para desenvolvimento do front-end.
- Node.js 20 e npm para o back-end.
- Acesso autorizado aos serviços Render e Supabase para implantação.
- Um banco PostgreSQL configurado para produção.

### 6.2 Executar localmente

Abra dois terminais, um para cada repositório.

**Back-end**

```powershell
Set-Location C:\Users\admin\Downloads\ProjFund_HospOswaldoDiesel_Back
npm install
npm run dev
```

O servidor local usa a porta 3000 por padrão.

**Front-end**

O arquivo `.env.local` deve apontar para o proxy local:

```env
VITE_API_URL=/backend
VITE_API_PROXY_TARGET=http://localhost:3000
```

Em seguida:

```powershell
Set-Location C:\Users\admin\Downloads\Projeto-Hospital
npm install
npm run dev
```

Abra o endereço impresso pelo Vite, normalmente
`http://localhost:5173`. Sem API configurada, o front pode abrir em modo de
demonstração, que usa dados fictícios locais; não use esse modo para registrar
dados reais.

Para validar o front-end antes da publicação:

```powershell
npm run lint
npm run build
```

Para executar os testes do back-end:

```powershell
Set-Location C:\Users\admin\Downloads\ProjFund_HospOswaldoDiesel_Back
npm test
```

### 6.3 Banco de dados e segredos

No serviço do back-end, configure as variáveis secretas diretamente no painel
do Render:

- `DATABASE_URL` **ou** o conjunto `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`
  e `DB_PASSWORD`; não configure os dois formatos ao mesmo tempo.
- `DB_SSL=true` para a conexão TLS com o banco.
- `JWT_SECRET` com um valor aleatório forte de pelo menos 32 caracteres.
- `NODE_ENV=production`.
- `CORS_ORIGIN=https://projeto-hospital-pqxh.onrender.com` (origem do front,
  sem barra no final).
- `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` somente quando for necessário
  criar/atualizar a conta administrativa inicial via seed.

O Render fornece a variável `PORT`. Não coloque credenciais no código,
documentação pública, front-end, GitHub ou mensagens. Não use credenciais de
demonstração em produção.

Após configurar o banco, a equipe responsável deve revisar a migração e
aplicá-la uma única vez com o processo aprovado:

```bash
npm run migrate
```

O seed inicial deve ser executado apenas por pessoa autorizada, após validar o
ambiente e definir as variáveis `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.
Não execute migrações ou seed em produção sem backup e aprovação da equipe
técnica.

### 6.4 Publicação no Render

**Front-end (Static Site)**

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Variável de build `VITE_API_URL`:
  `https://projfund-hosposwaldodiesel-back.onrender.com`
- Regra de rota SPA: **Rewrite** `/*` para `/index.html`, com status `200`.

O rewrite é necessário para que o React Router consiga abrir e atualizar
endereços como `/manual`, `/tv-wall` e `/gestao/login` diretamente.

**Back-end (Web Service)**

- Configure as variáveis descritas em **Banco de dados e segredos**.
- Defina `CORS_ORIGIN` como a URL pública exata do front.
- A URL de saúde é `/health`; ela deve indicar `database: "connected"` quando
  o banco estiver configurado e acessível.
- A documentação das rotas da API fica em `/docs`.

Depois de cada publicação, valide a página inicial, uma rota interna aberta
diretamente, o carregamento de setores e perguntas e a tela de login. Nunca use
dados de pacientes para testes de publicação.

## 7. Privacidade e uso responsável

- Use apenas dados necessários ao atendimento da manifestação.
- Não inclua dados pessoais em comentários livres, exceto quando indispensável
  e com a informação/consentimento apresentados ao usuário.
- Restrinja contas administrativas e revise os acessos periodicamente.
- Não projete o TV Wall para exibir relatos, contatos ou resultados que
  identifiquem pacientes.
- O limite mínimo para indicadores públicos reduz risco de identificação, mas
  não substitui avaliação de privacidade pela instituição.
- O texto da política na aplicação deve ser revisado pela instituição e pelo
  responsável por privacidade antes do uso oficial.
- O projeto usa PostgreSQL em produção. O modo em memória é voltado a
  desenvolvimento/testes e perde os dados quando o processo é reiniciado.

## 8. Solução de problemas

| Sintoma | O que verificar |
| --- | --- |
| Página inicial abre, mas `/manual`, `/tv-wall` ou outra rota retorna 404 ao atualizar | Configure no Static Site do Render o rewrite `/*` → `/index.html`, status `200`, e publique novamente. |
| Setores ou perguntas não carregam | Consulte `/health`, verifique se o back-end está ativo, se `VITE_API_URL` está correto e se o `CORS_ORIGIN` contém a origem exata do front. |
| API não inicia em produção | Confira `DATABASE_URL` ou todas as variáveis `DB_*`, `JWT_SECRET`, `NODE_ENV` e `CORS_ORIGIN` no painel do serviço; não compartilhe seus valores. |
| Login não funciona | Confirme que a conta foi criada no banco e que o perfil/setor estão corretos. As contas de demonstração são somente locais. |
| Indicador por setor não aparece no TV Wall | O limite mínimo de respostas pode ainda não ter sido atingido. |
| Respostas locais desaparecem ao reiniciar o back-end | O back-end está em modo de memória; configure e valide o banco PostgreSQL para persistência. |
| O Render ainda mostra uma versão antiga | Confira o resultado do último deploy, erros de build e se o front foi reconstruído após mudar variáveis `VITE_*`. |

## 9. Estado conhecido da publicação

Na verificação de **6 de novembro de 2026**, a página inicial do front e a API
responderam, e a API indicou conexão com o banco. Entretanto, os endereços
internos do front, quando abertos diretamente, retornaram 404. A regra de
rewrite descrita acima precisa ser confirmada no painel do Render e validada
após novo deploy. Refaça essa verificação antes de considerar a publicação
integralmente operacional.

## 10. Contatos e responsabilidades

- **Administrador do sistema:** contas, perfis, setores e perguntas.
- **Ouvidoria:** análise e atualização das manifestações conforme o fluxo
  institucional.
- **Equipe técnica:** hospedagem, banco, credenciais, backup, migrações,
  observabilidade e atualização da aplicação.
- **Instituição:** aprovação da política de privacidade, retenção de dados,
  canais de atendimento e critérios de encaminhamento.

