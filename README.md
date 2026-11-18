# DataOps

Painel de dados em **HTML, CSS e JavaScript puro**, com banco de dados **PostgreSQL hospedado no Supabase** e
publicação estática (Vercel). Não há servidor próprio: o navegador conversa direto com o Supabase, e a
segurança é aplicada pelo banco (Row Level Security) e pelo Supabase Auth.

- Sem Node.js rodando, sem PostgreSQL local, sem build.
- Acesso **somente por convite**: o cadastro público fica desligado.
- Todos os usuários logados veem os mesmos dados da empresa.

---

## 1. Estado atual do projeto

| Área | Situação |
|---|---|
| Login, logout, recuperação de senha, convite | Pronto (Supabase Auth) |
| Proteção do dashboard | Pronto (sessão verificada ao abrir; os dados são protegidos pelo RLS) |
| Banco de dados (22 tabelas, 4 views, 8 funções, RLS) | Pronto (migrations `0001` a `0006`) |
| Central de Dados (importação de CSV, tabela, filtros) | Pronto, lê e grava no Supabase |
| Visão Geral e Análises (cards, gráficos, alertas, atividades recentes) | Pronto, calculados no banco |
| Relatórios por departamento | Funciona sobre a tabela da Central de Dados |
| Abas **Financeiro, Comercial, Logística e TI** | **Ainda com dados de demonstração** (tabelas já existem no banco; falta ligar as telas) |
| Perfil, preferências e notificações | **Ainda no navegador** (`localStorage`); migração para o banco é a próxima etapa |

---

## 2. Estrutura de pastas

```
index.html                 porta de entrada (encaminha para o login ou para a ativação de convite)
vercel.json                cabeçalhos de segurança para a hospedagem
HTML/
  Login.html               login (Supabase Auth)
  Esqueci-a-senha.html     pedido de recuperação de senha
  cadastro.html            "Ativar acesso": convidado define nome e senha / nova senha
  dashboard.html           painel (Visão geral, Análises, Central de Dados, setores, Relatórios, Configurações)
CSS/                       estilos de cada tela
JS/
  config/supabase-config.js   URL do projeto + chave PUBLICÁVEL
  services/
    supabaseClient.js         cliente Supabase único (SDK oficial, versão fixa)
    authService.js            login, logout, sessão, recuperação
    dataService.js            consultas e gravações compartilhadas entre telas
    csv.js                    leitor de CSV
    ready.js                  cria window.DataOpsReady (aguarda a sessão)
    dashboard-boot.js         verifica a sessão e libera o painel
  pages/                      scripts das telas de login, recuperação e ativação
  dashboard.js, *-dash.js, comercial.js, relatorios-configuracoes.js, intro.js, logout.js
supabase/
  migrations/              SQL do banco (rodar na ordem)
  templates/               CSV de exemplo para testar a importação
  LEIA-ME.md               passo a passo resumido do banco
```

> `JS/configuracoes.js` e `JS/notificacoes.js` não são carregados pelo `dashboard.html`: são versões antigas
> (o código ativo está em `relatorios-configuracoes.js`).

---

## 3. Criar o projeto no Supabase

1. Entre em <https://supabase.com/dashboard> e crie um projeto (o plano gratuito basta).
2. Em **Project Settings → API**, anote:
   - a **URL do projeto** (`https://SEU-PROJETO.supabase.co`);
   - a **chave publicável** (`sb_publishable_...`).

Essas duas informações **podem ficar no navegador**, desde que o RLS esteja ativo (as migrations já ativam).

> **Nunca** coloque no código, no Git ou neste README: chave secreta (`sb_secret_...`), `service_role`,
> senha do banco ou qualquer token administrativo.

## 4. Configurar as credenciais públicas

Edite `JS/config/supabase-config.js`:

```js
export const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_...";
```

Como o projeto não usa bundler, não há arquivo `.env`: esse arquivo é a configuração. Não há variáveis de
ambiente a configurar na Vercel.

## 5. Criar as tabelas (migrations)

No Supabase, abra **SQL Editor → New query**, cole o conteúdo de cada arquivo **na ordem** e clique em **Run**,
um por vez:

1. `supabase/migrations/0001_core.sql`: perfis, preferências, notificações, registros, trigger de novo usuário
2. `supabase/migrations/0002_finance.sql`
3. `supabase/migrations/0003_commercial.sql`
4. `supabase/migrations/0004_logistics.sql`
5. `supabase/migrations/0005_it.sql`
6. `supabase/migrations/0006_views_and_kpis.sql`: views e funções de KPI

Observações:

- As migrations só **criam** objetos; não apagam nada. Se um nome já existir, o SQL falha de propósito
  (não sobrescreve). **Não rode o mesmo arquivo duas vezes.**
- Nos arquivos `0002` a `0005`, o editor mostra o aviso *"creates tables without enabling RLS"*. Clique em
  **Run and enable RLS**: o RLS já é ativado dentro do script, o editor só não consegue enxergar isso.
- Se o `0006` falhar com `relation "public.it_incidents" does not exist`, o `0005` não foi concluído. Rode o
  `0005` e depois o `0006`.

**Conferência.** Rode no SQL Editor:

```sql
select
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity)     as tabelas_com_rls,
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity) as tabelas_sem_rls,
  (select count(*) from pg_views  where schemaname = 'public' and viewname like 'v\_%') as views,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'rpc\_%') as funcoes_rpc;
```

Resultado esperado: `22`, `0`, `4`, `8`.

## 6. Configurar a autenticação

Em **Authentication**:

1. **Sign In / Providers → Email**: mantenha o provedor Email ativo, defina o tamanho mínimo da senha como **8** e
   **desligue "Allow new users to sign up"** (acesso só por convite).
2. **URL Configuration**:
   - **Site URL**: o endereço onde o site roda (veja as seções 7 e 8);
   - **Redirect URLs**: adicione `<endereço-do-site>/HTML/cadastro.html`.
3. (Opcional) **Emails**: traduza os modelos de e-mail de convite e recuperação.

### Regras de acesso (RLS)

| Quem | O que pode |
|---|---|
| Sem login | Nada |
| Usuário logado | Ler todos os dados da empresa |
| Usuário logado | Cadastrar registros; **só o autor** edita ou exclui o que criou |
| Cada usuário | Alterar apenas o próprio perfil, preferências e notificações |

A identidade vem sempre de `auth.uid()` no banco; o navegador nunca informa quem é o autor.

## 7. Rodar localmente (desenvolvimento)

Os módulos JavaScript não funcionam abrindo o arquivo direto (`file://`). Use um servidor estático:

1. No VS Code, instale a extensão **Live Server**.
2. Abra a pasta do projeto, clique com o botão direito em `index.html` → **Open with Live Server**.
3. Veja o endereço na barra do navegador (por exemplo `http://127.0.0.1:5500/index.html`).

Para os e-mails de convite e recuperação funcionarem **no seu computador**, cadastre esse endereço no Supabase
(Authentication → URL Configuration):

- Site URL: `http://127.0.0.1:5500/index.html`
- Redirect URL: `http://127.0.0.1:5500/HTML/cadastro.html`

Use exatamente o endereço que o seu navegador mostra (se a pasta tiver espaço no nome, ele aparece como `%20`;
`localhost` e `127.0.0.1` contam como endereços diferentes).

> Um convite enviado enquanto a Site URL aponta para `127.0.0.1` só abre **no computador de quem está rodando o
> Live Server**. Para convidar outras pessoas, publique o site (próxima seção).

## 8. Publicar na Vercel (produção)

1. Coloque o projeto num repositório do GitHub (o `index.html` e o `vercel.json` na raiz do repositório).
2. Em <https://vercel.com>, **Add New → Project**, importe o repositório.
3. Configuração: *Framework Preset* **Other**; deixe *Build Command* e *Output Directory* vazios (site estático).
   Se o repositório tiver o projeto dentro de uma subpasta, defina-a em **Root Directory**.
4. **Deploy**. Anote o endereço (por exemplo `https://seu-projeto.vercel.app`).
5. No Supabase (**Authentication → URL Configuration**):
   - **Site URL**: `https://seu-projeto.vercel.app/index.html`
   - **Redirect URLs**: adicione `https://seu-projeto.vercel.app/HTML/cadastro.html`
     (pode manter também o endereço do Live Server).

Não há variáveis de ambiente a configurar. A cada `git push` na branch principal, a Vercel publica de novo.

## 9. Convidar usuários

1. No Supabase: **Authentication → Users → Add user → Send invitation**, com o e-mail da pessoa.
2. A pessoa abre o e-mail, clica **uma única vez** em *Accept invitation*, e na tela **Ativar acesso** informa
   nome completo e senha (mínimo de 8 caracteres).
3. Ela cai no dashboard. O perfil e as preferências são criados automaticamente.

Se o link der "inválido ou expirado": ele vale **uma vez** e por tempo limitado (e alguns antivírus de e-mail
abrem o link antes da pessoa). Apague o usuário em Authentication → Users e convide de novo.

## 10. Importar dados e testar

1. Entre no site, abra **Central de Dados**, escolha o setor, selecione um CSV e importe.
   Para testar, use `supabase/templates/exemplo-teste-central-de-dados.csv` (ids `TESTE-001` a `TESTE-004`).
2. Formato do CSV: primeira linha com as colunas `id`, `registro`, `categoria` e `status`; separador `,` ou `;`;
   campos com vírgula entre aspas.
   - Status reconhecidos: concluído/finalizado/done/success, pendente/aguardando, em andamento/processando,
     erro/falha/falhou. Qualquer outro vira "Outro".
   - Linhas sem `id` ou `registro` são ignoradas e avisadas. Registros repetidos (mesmo setor e mesmo `id`) são ignorados.
3. Resultado esperado com o arquivo de exemplo: **total 4, 1 concluído, 1 pendente, taxa de sucesso 25,0**;
   alertas de erro, pendência e andamento; e 4 linhas em **Table Editor → `records`**.
4. Recarregue a página (F5): os números continuam, porque vêm do banco.
5. Para limpar o teste, exclua as linhas `TESTE-...` em **Table Editor → `records`**.

> **Importe pelo site, não pelo Table Editor do Supabase.** O importador do painel exige colunas com os nomes da
> tabela (`title`, `category`...), ignora o RLS e deixaria os registros sem dono (`created_by` vazio).

## 11. Diagnóstico de problemas

| Sintoma | Causa provável e solução |
|---|---|
| `function "set_updated_at" already exists` | O `0001` já foi executado. Não rode de novo; confira as tabelas existentes. |
| Cards mostram 12.450 / 1.280 / 36 / 98,5 | Versão antiga dos arquivos. Copie os arquivos novos e use Ctrl + F5. |
| Cards em "—" e alerta "Não foi possível carregar os dados" | Falha de comunicação ou de permissão. Abra o Console (F12) e veja o erro; confirme URL e chave em `supabase-config.js` e se as migrations rodaram. |
| Importação diz que o usuário não tem permissão | Sessão expirada ou RLS sem as políticas. Entre de novo; confira no SQL Editor que `records` tem 4 políticas. |
| Tela em branco no dashboard | A verificação de sessão não terminou (CDN bloqueada ou sem internet). Recarregue; após ~12 s aparece um aviso. |
| Dashboard abre sem pedir login | Você ainda tem sessão ativa (normal). Clique em sair ou teste numa janela anônima. |
| Link do convite: "conexão recusada" (`127.0.0.1`) | A Site URL aponta para o Live Server local. Publique o site e troque a Site URL. |
| Link do convite: `otp_expired` | Link já usado ou vencido. Apague o usuário e convide de novo. |
| Convite não chega | O plano gratuito limita e-mails por hora; confira o spam e aguarde. |
| `Failed to fetch` / sem conexão | Internet fora ou URL do projeto errada em `supabase-config.js`. |
| Página abre mas links quebram na Vercel | A Vercel diferencia maiúsculas de minúsculas: use `Login.html`, não `login.html`. |

## 12. Segurança

- Só a **URL** e a **chave publicável** ficam no navegador. A proteção real está no **RLS** do banco.
- O redirecionamento para o login é apenas conforto de interface; sem login o Supabase não devolve dados.
- Políticas de escrita: o autor do registro (`created_by = auth.uid()`) é o único que edita ou exclui.
- `vercel.json` adiciona cabeçalhos básicos (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`). Uma *Content-Security-Policy* ainda não foi definida.
- Os scripts de Chart.js e do plugin de rótulos são carregados de CDN **sem versão fixa**
  (`dashboard.html`); considere fixar as versões.

## 13. Pendências conhecidas

- Ligar **Financeiro, Comercial, Logística e TI** ao banco (modelos de CSV por setor e importações próprias).
- Migrar **perfil, preferências e notificações** do `localStorage` para o banco; o nome no menu lateral
  ainda aparece como "Usuário".
- O arquivo `JS/graficos-efeitos.js` (efeitos dos gráficos) é referenciado pelo `dashboard.html`, mas não faz parte
  deste repositório. Sem ele, os gráficos usam cores translúcidas; com ele na pasta `JS/`, os efeitos voltam.
- Textos "demonstrativo" ainda existem no card de Relatórios e no rodapé.
