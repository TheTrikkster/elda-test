# ELDA — Frontend (React + Vite + Mapbox GL)

Voir le [README racine](../README.md) pour le contexte et l'architecture.

## Démarrage

```bash
cp .env.example .env   # renseigne VITE_MAPBOX_TOKEN=pk.xxxx
pnpm install
pnpm dev               # http://localhost:5173
```

Variables d'environnement (`.env`) :

- `VITE_MAPBOX_TOKEN` — token public Mapbox (account.mapbox.com)
- `VITE_API_URL` — base URL du back (défaut `http://localhost:3000`)
