# Caixinha Sorteio

Aplicacao React/Vite para sortear valores entre 1 e 99 e salvar o historico de uma viagem no Supabase.

## Ambiente

Crie um `.env.local` com:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_TRIP_ID=1
VITE_ALLOWED_EMAILS=voce@exemplo.com,namorada@exemplo.com
```

## Rodando localmente

```bash
npm install
npm run dev
```

## Autenticacao com Supabase

O app agora exige login por e-mail e senha usando Supabase Auth.

### 1. Ativar o login por e-mail e senha

No painel do Supabase:

1. Abra `Authentication > Providers > Email`.
2. Ative `Email provider`.
3. Garanta que o fluxo de senha esteja habilitado para o provider de e-mail.

### 2. Criar os dois usuarios com senha

Em `Authentication > Users`, crie os dois usuarios com os e-mails que vao poder acessar o app e defina uma senha para cada um.

### 3. Ligar RLS nas tabelas

Sem isso, a tela de login nao protege de verdade os dados. Execute no SQL Editor:

```sql
alter table public.trips enable row level security;
alter table public.draws enable row level security;

create policy "allowed users can read trips"
on public.trips
for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') in ('voce@exemplo.com', 'namorada@exemplo.com')
);

create policy "allowed users can read draws"
on public.draws
for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') in ('voce@exemplo.com', 'namorada@exemplo.com')
);

create policy "allowed users can insert draws"
on public.draws
for insert
to authenticated
with check (
  lower(auth.jwt() ->> 'email') in ('voce@exemplo.com', 'namorada@exemplo.com')
);

create policy "allowed users can update draws"
on public.draws
for update
to authenticated
using (
  lower(auth.jwt() ->> 'email') in ('voce@exemplo.com', 'namorada@exemplo.com')
)
with check (
  lower(auth.jwt() ->> 'email') in ('voce@exemplo.com', 'namorada@exemplo.com')
);
```

Troque os e-mails pelos de voces.

Se ja existirem policies antigas liberando `anon`, revise ou remova antes de publicar.

## Deploy no GitHub Pages

O workflow em `.github/workflows/deploy.yml` faz o build e publica o site no GitHub Pages.

Adicione estes secrets no repositorio:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_TRIP_ID`
- `VITE_ALLOWED_EMAILS`
