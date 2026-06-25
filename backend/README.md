# ELDA — Backend (NestJS + PostGIS)

Voir le [README racine](../README.md) pour le contexte, l'architecture et les
instructions de démarrage complètes.

## Scripts utiles

```bash
pnpm migrate     # applique drizzle/*.sql (extension PostGIS, tables, index GiST)
pnpm seed        # charge data/elda_seed_dameuses.json
pnpm db:setup    # migrate + seed
pnpm start:dev   # API REST :3000 + WebSocket + simulateur
pnpm lint        # eslint --fix
```
