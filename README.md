# KingCoin App

App mobile de controle financeiro pessoal, versão React Native do [KingCoin](https://github.com/israreis/KingCoin). Usa **Expo (SDK 58)** e **Supabase** como backend (login, banco Postgres e arquivos).

## Funcionalidades

- Movimentações (receitas, despesas e economia) com busca, filtros e comprovante em foto
- Movimentações recorrentes, orçamentos por categoria e categorias personalizadas
- Metas com aportes rápidos
- Dashboard com insights do mês e gráficos
- Relatórios em PDF e Excel
- Login com e-mail, Google ou Apple; biometria; lembretes por notificação
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
4. Em **Authentication > Emails > Reset Password**, mostre o código no e-mail:
   ```html
   <p>Seu código é: <b>{{ .Token }}</b></p>
   ```
5. Copie a **Project URL** e a chave **anon / publishable** em **Project Settings > API**.

Login com Google (opcional): crie um OAuth Client ID (tipo *Web*) no Google Cloud com o redirect `https://SEU-PROJETO.supabase.co/auth/v1/callback`, cole os dados em **Authentication > Providers > Google** e adicione `kingcoin://**` e `exp://**` em **Authentication > URL Configuration > Redirect URLs**.

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
