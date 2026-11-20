# KingCoin App

App de controle financeiro pessoal para **iPhone, Android e navegador**, a partir de um único código. Usa **Expo (SDK 58)** e **Supabase** como backend (login, banco Postgres e arquivos).

## Status do projeto

| Versão | Situação |
| --- | --- |
| **Mobile (iOS e Android)** | Versão principal. Funcionalidades completas e testadas. |
| **Web** | Publicada em **[kingcoin-nine.vercel.app](https://kingcoin-nine.vercel.app)** e instalável como app (PWA). Usa a mesma conta e o mesmo banco do app. |

## Funcionalidades

- Movimentações (receitas, despesas e economia) com busca, filtros e comprovante em foto
- Movimentações recorrentes, orçamentos por categoria e categorias personalizadas
- Metas com aportes rápidos
- Dashboard com insights do mês e gráficos
- Relatórios em PDF e Excel
- Login com e-mail, Google ou Apple; biometria; lembretes por notificação
- Exclusão da conta confirmada por código enviado ao e-mail (funciona também para contas Google/Apple)
- Modo offline: abre com os últimos dados e envia depois as movimentações criadas sem internet

## Requisitos

- Node.js 22.13+, 24.3+ ou 26+ (versões ímpares não são suportadas pelo SDK 58)
- Conta gratuita no [Supabase](https://supabase.com)
- App **Expo Go** no celular (ou um development build, veja abaixo)

## Configuração

### 1. Supabase

1. Crie um projeto e abra **SQL Editor > New query**.
2. Cole e execute o arquivo [`supabase/schema.sql`](supabase/schema.sql) inteiro. Ele cria tabelas, regras de segurança, funções e buckets, e pode ser executado de novo sempre que o arquivo mudar.
3. Em **Authentication > Providers > Email**:
   - **Confirm email**: desative para testar sem confirmar cada cadastro (opcional).
   - **Secure password change** e **Secure email change**: ative.
   - **Minimum password length** = 8 e **Password requirements** com maiúsculas e símbolos.
4. Configure o envio de e-mails e mostre o código nos modelos. O Supabase só deixa editar os modelos com **SMTP próprio**:
   - Numa conta Gmail dedicada ao projeto, ative a verificação em duas etapas e crie uma **senha de app** em `myaccount.google.com/apppasswords`.
   - Em **Authentication > Emails > SMTP Settings**, ative *Custom SMTP*: host `smtp.gmail.com`, porta `465`, usuário e remetente = o Gmail do projeto, senha = a senha de app, nome do remetente `KingCoin` (o Gmail permite cerca de 500 e-mails/dia; para mais, use Brevo ou Resend).
   - Em **Authentication > Emails**, nos modelos **Reset Password** (recuperar senha) e **Magic link or OTP** (confirmação para excluir a conta), troque o corpo para mostrar o código:
   ```html
   <h2>Código de confirmação</h2>
   <p>Use este código no KingCoin: <b style="font-size:24px;letter-spacing:4px">{{ .Token }}</b></p>
   <p>Ele vale por pouco tempo e só pode ser usado uma vez.</p>
   ```
5. Copie a **Project URL** e a chave **anon / publishable** em **Project Settings > API**.

Login com Google (opcional):

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto (ex.: `KingCoin`) e selecione-o no seletor do topo.
2. Em **Google Auth Platform** (antes "Tela de consentimento OAuth"): preencha **Branding** (nome KingCoin, e-mail de suporte, domínios autorizados `SEU-PROJETO.supabase.co` e o domínio do site), **Público-alvo** como *Externo* (em modo Teste só entram os usuários de teste; publique quando estiver pronto) e, em **Acesso a dados**, os escopos `openid`, `userinfo.email` e `userinfo.profile`.
3. Em **Clientes > Criar cliente**, tipo **Aplicativo da Web**:
   - *Origens JavaScript autorizadas*: o endereço do site (ex.: `https://kingcoin-nine.vercel.app`) e `http://localhost:8081`.
   - *URIs de redirecionamento autorizados*: **só** o callback do Supabase, `https://SEU-PROJETO.supabase.co/auth/v1/callback` (quem recebe a resposta do Google é o Supabase, não o site).
4. No Supabase, em **Authentication > Sign In / Providers > Google**, ative e cole o *Client ID* e o *Client Secret* (o secret nunca vai para o app nem para o repositório).
5. Em **Authentication > URL Configuration**: **Site URL** = endereço do site; em **Redirect URLs**, `https://SEU-ENDERECO-WEB/**`, `http://localhost:8081/**`, `kingcoin://**` e `exp://**` (o `/**` é obrigatório: o retorno na web passa por `/auth/callback`).

6. Para liberar o login a qualquer conta Google, em **Público-alvo** clique em **Publicar app** (exige página inicial, Política de Privacidade e Termos preenchidos em **Branding**; o KingCoin já tem as páginas em `/landing/privacidade.html` e `/landing/termos.html`). Com os escopos básicos a publicação vale na hora.
7. **Verificação de marca (opcional, para o logo e o nome aparecerem na tela do Google):** verifique o domínio no [Google Search Console](https://search.google.com/search-console) como propriedade *Prefixo do URL*, com a mesma conta que é **Proprietária** do projeto no Google Cloud. O arquivo de verificação fica em `public/googleab7c6d15e38e0d9a.html` — **não apague**. Depois, em **Central de verificação**, envie para análise (leva alguns dias úteis; se acabou de verificar o domínio, espere 24 h antes de enviar).

Erros comuns: *redirect_uri_mismatch* no Google = o URI do passo 3 não é o callback do Supabase; "Endereço de retorno não autorizado" no app = falta o endereço em Redirect URLs; "Acesso bloqueado" = app em modo Teste e e-mail fora da lista de usuários de teste.

O botão "Continuar com Google" aparece no login e no cadastro, no celular e na web. Na web o retorno passa por `/auth/callback`, que espera a sessão e segue para o início (ou volta ao login com a mensagem de erro).

### 2. App

```bash
git clone https://github.com/israreis/KingCoin_App.git
cd KingCoin_App
npm install
npx expo install --fix
cp .env.example .env    # preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start -c
```

Escaneie o QR code com o Expo Go. O celular precisa estar na mesma rede do computador; se não conectar, use `npx expo start --tunnel`.

Nunca coloque a chave `service_role` no app: a chave anon é pública e quem protege os dados é o Row Level Security do `schema.sql`.

## Versão web

Login (e-mail, senha e Google), Carteira, Movimentações, Metas, Dashboard, Organização (orçamentos, recorrências e categorias) e relatórios em PDF e Excel funcionam no navegador, no celular e no computador.

```bash
npm run web          # abre no navegador em http://localhost:8081
npm run build:web    # gera o site estático em dist/
```

No Supabase, em **Authentication > URL Configuration**, adicione em **Redirect URLs** o endereço local (`http://localhost:8081/**`) e o endereço publicado (`https://SEU-ENDERECO-WEB/**`). Use o endereço publicado também como **Site URL**.

Publicação gratuita (escolha um):

- **Vercel**: importe o repositório; o `vercel.json` já define o build e o redirecionamento das rotas. Cadastre `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` nas variáveis de ambiente **antes do primeiro deploy** (elas entram no app na hora do build; se mudar depois, faça *Redeploy*). Preset: *Other*.
- **Netlify**: comando de build `npx expo export --platform web`, pasta `dist`; o `public/_redirects` já trata as rotas. Cadastre as mesmas variáveis.
- **EAS Hosting**: `npx expo export --platform web` e depois `npx eas-cli deploy`.

### Instalar como app (PWA)

A versão web é uma **PWA**: dá para instalar pelo navegador, sem loja e sem APK.

- **Android (Chrome)**: menu ⋮ > **Instalar app** (ou o aviso que aparece na barra de endereço).
- **iPhone (Safari)**: botão Compartilhar > **Adicionar à Tela de Início**.
- **Computador (Chrome/Edge)**: ícone de instalar na barra de endereço.

O app instalado abre em tela cheia, com ícone próprio, e entra direto na tela inicial se você já estiver logado (sem login, mostra a landing). Arquivos: `public/manifest.webmanifest` (nome, cores, ícones em `public/pwa/`), `public/sw.js` (service worker: guarda o app para abrir rápido e sem tela branca offline; dados do Supabase sempre vêm da rede) e `src/lib/pwa.ts` (liga o manifesto, as tags do iPhone e registra o service worker no build de produção). Ao mudar `sw.js`, troque `VERSAO` para limpar o cache antigo.

No iPhone, o fundo da página acompanha o tema (`aplicarCorDaPagina` em `src/lib/pwa.ts`) para as barras do Safari não ficarem brancas, e as barras de rolagem ficam escondidas na web.

Na web, quem abre o endereço principal sem login vê primeiro a landing page (`public/landing/`, com Política de Privacidade e Termos de Uso em `privacidade.html` e `termos.html`); os botões dela levam ao cadastro e ao login do app. Biometria e lembretes ficam escondidos, o comprovante é escolhido como arquivo, o Excel é baixado direto e o PDF abre a janela de impressão (escolha "Salvar como PDF").

## Expo Go x development build

No Expo Go quase tudo funciona, com três exceções:

- **Face ID**: o iPhone pede o código do aparelho no lugar do rosto.
- **Login com Apple**: não funciona (exige conta Apple Developer paga).
- **Notificações**: funcionam, mas sem o nome e o ícone do KingCoin.

Para ter o comportamento completo, gere um development build:

```bash
npm install -g eas-cli
eas login
npx expo install expo-dev-client
eas build --profile development --platform android   # ou ios
npx expo start --dev-client
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento |
| `npm run web` | Abre a versão web no navegador |
| `npm run build:web` | Gera a versão web para publicar (`dist/`) |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm test` | Roda os testes automatizados |
| `npm run test:watch` | Roda os testes de novo a cada arquivo salvo |
| `npm run test:coverage` | Roda os testes e gera o relatório de cobertura em `coverage/` |

## Estrutura

```
app/              Telas e rotas (Expo Router)
src/components/   Componentes de interface
src/lib/          Supabase, API, regras de saldo, offline, notificações, biometria
supabase/         Esquema do banco
docs/             Plano de testes manuais
```

## Testes

Testes automatizados ficam em `__tests__/` (regras de negócio em `lib/`, componentes em `components/`). A cobertura mínima exigida das regras de negócio é 95% das linhas.

O roteiro de testes manuais, com avaliação de cada funcionalidade, está em [`docs/PLANO_DE_TESTES.md`](docs/PLANO_DE_TESTES.md).

## Problemas comuns

- **"Could not find the table" ou "column does not exist"**: rode o `schema.sql` de novo.
- **`git pull` recusado por alterações no `package.json`**: rode `git checkout package.json` e repita o pull; depois `npm install` e `npx expo install --fix`.
- **"Invalid path specified in request URL"**: a URL no `.env` deve terminar em `.supabase.co`, sem `/rest/v1`.
- **"You need to be signed in to Expo CLI"**: rode `npx expo login` (contas criadas pelo GitHub podem usar um token em `EXPO_TOKEN`).
- **Projeto do Supabase pausado**: projetos gratuitos pausam após 7 dias com pouco uso. Restaure em **Resume project** no painel (os dados voltam) e use o app pelo menos algumas vezes por semana.
- **O código não chega / chega um link em vez do código**: confira o SMTP e os modelos de e-mail (passo 4 do Supabase).

## Contato

Dúvidas, sugestões ou pedidos sobre dados: [israreis.dev@gmail.com](mailto:israreis.dev@gmail.com).
