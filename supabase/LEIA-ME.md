# DataOps | Banco de dados no Supabase

Estas migrations criam a estrutura do banco. **Não executam nada sozinhas**: você as roda no seu projeto.
Elas só criam objetos novos: não apagam tabelas nem alteram dados existentes. Se algum nome já existir, o SQL
falha com erro (de propósito) em vez de sobrescrever.

## Antes de rodar
1. Em **Authentication > Providers > Email**: mantenha "Email" ativo e **desligue "Allow new users to sign up"**
   (acesso somente por convite).
2. Em **Authentication > Providers > Email**: ajuste o tamanho mínimo de senha para **8**.
3. Em **Authentication > URL Configuration**:
   - **Site URL**: a URL do site publicado (ex.: `https://seu-projeto.vercel.app`).
   - **Redirect URLs**: adicione `https://seu-projeto.vercel.app/HTML/cadastro.html`
     (e, para testes locais, `http://localhost:5500/HTML/cadastro.html` ou a porta que você usar).

## Como rodar (SQL Editor)
Abra **SQL Editor > New query**, cole o conteúdo de cada arquivo **na ordem** e clique em Run:

1. `migrations/0001_core.sql`       perfis, preferências, notificações, registros, trigger de novo usuário
2. `migrations/0002_finance.sql`
3. `migrations/0003_commercial.sql`
4. `migrations/0004_logistics.sql`
5. `migrations/0005_it.sql`
6. `migrations/0006_views_and_kpis.sql`   views e funções de KPI

Rode um arquivo por vez; se der erro, pare e me envie a mensagem completa.

## Conferência rápida
- **Table Editor**: todas as tabelas devem aparecer com o cadeado de RLS ligado.
- **Authentication > Policies**: cada tabela deve listar suas políticas.
- No SQL Editor: `select count(*) from public.records;` deve devolver 0 (sem erro).

## Convidar usuários
**Authentication > Users > Invite user**. A pessoa recebe um e-mail, abre o link e define nome e senha em
`cadastro.html`. O perfil e as preferências são criados automaticamente.

## Regras de acesso (resumo)
- Sem login: nenhum acesso.
- Usuário logado: lê todos os dados da empresa.
- Cadastra registros; só o autor do registro edita ou exclui.
- Preferências, notificações e perfil: cada pessoa só altera os seus.
