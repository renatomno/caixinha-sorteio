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

## PWA no celular

O app agora tambem pode ser usado como PWA. Isso significa que ele continua abrindo por link, mas pode ser instalado na tela inicial do celular como se fosse um app.

- No Android, o navegador pode mostrar o botao de instalar automaticamente.
- No iPhone e iPad, a instalacao costuma ser pelo menu `Compartilhar > Adicionar a Tela de Inicio`.
- O service worker e o manifesto sao publicados junto com o build, entao o GitHub Pages ja serve a versao instalavel em HTTPS.

### Como testar localmente

Para validar o fluxo de instalacao e cache offline, teste a versao de producao:

```bash
npm run build
npm run preview
```

Abra a URL exibida pelo Vite no celular ou em um navegador com simulacao mobile. O `npm run dev` continua bom para desenvolver a interface, mas a instalacao PWA depende da versao buildada.

## Autenticacao com Supabase

O app agora exige login por e-mail e senha usando Supabase Auth. A tela tambem permite criar conta no primeiro acesso.

### 1. Ativar o login por e-mail e senha

No painel do Supabase:

1. Abra `Authentication > Providers > Email`.
2. Ative `Email provider`.
3. Garanta que o fluxo de senha esteja habilitado para o provider de e-mail.

### 2. Liberar os e-mails de voces

O cadastro pode ser feito pela propria tela do app, mas o acesso real continua limitado pelos e-mails liberados nas policies do Supabase.

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

Depois do deploy, o PWA fica disponivel no mesmo link publicado pelo Pages.

Adicione estes secrets no repositorio:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_TRIP_ID`
- `VITE_ALLOWED_EMAILS`
