# Caixinha Sorteio

Aplicacao React/Vite para sortear valores entre 1 e 99 e salvar o historico de uma viagem no Supabase.

## Ambiente

Crie um `.env.local` com:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_TRIP_ID=1
```

## Rodando localmente

```bash
npm install
npm run dev
```

## Deploy no GitHub Pages

O workflow em `.github/workflows/deploy.yml` faz o build e publica o site no GitHub Pages.

Adicione estes secrets no repositório:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_TRIP_ID`
