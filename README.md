# ELDA — Live tracking des dameuses

Suivi temps réel de dameuses sur une carte : back **NestJS** + **PostgreSQL/PostGIS**,
front **React + Mapbox GL**, positions poussées en direct via **WebSocket (socket.io)**.
Les requêtes spatiales métier sont faites **en base, en PostGIS** (jamais recalculées en JS).

---

## Démarrage rapide

Prérequis : **Docker**, **Node ≥ 20**, **pnpm**, et un **token Mapbox public** gratuit
(https://account.mapbox.com/access-tokens/).

```bash
# 1. Base PostGIS
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
pnpm install
pnpm migrate      # crée l'extension PostGIS, les tables et les index GiST
pnpm seed         # charge data/elda_seed_dameuses.json (4 dameuses + zone)
pnpm start:dev    # API REST :3000 + WebSocket + simulateur live

# 3. Frontend (autre terminal)
cd frontend
cp .env.example .env
#   -> renseigne VITE_MAPBOX_TOKEN=pk.xxxx dans frontend/.env
pnpm install
pnpm dev          # http://localhost:5173
```

Raccourci back : `pnpm db:setup` = `migrate` + `seed`.

---

## Endpoints

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/machines` | Machines + **dernière position connue** |
| `GET` | `/machines/:id/track` | Trace complète ordonnée |
| `GET` | `/machines/:id/distance-in-zone?zoneId=test-zone` | **Distance parcourue dans la zone** (mètres) |
| `GET` | `/zones` | Zone(s) en GeoJSON |
| `GET` | `/zones/:id/machines` | **Machines actuellement dans la zone** (ST_Within) |
| WS | `position:update` | `{ machineId, lng, lat, recordedAt }` à chaque déplacement |

---

## Structure du back NestJS (et pourquoi)

Découpage **par domaine**, chaque module a une responsabilité claire :

```
src/
├── db/                 DatabaseModule (provider Drizzle global) + schéma + migration runner
├── machines/           lecture machines, trace, distance-in-zone
├── zones/              lecture zone + machines-in-zone
└── realtime/           PositionsGateway (socket.io) + SimulatorService
```

- **Drizzle** comme ORM : typé, léger, *SQL-first*. Il sert au typage et au query-building,
  mais je **garde la main sur le SQL PostGIS**.
- **DDL PostGIS écrite à la main** (`drizzle/0000_init.sql`) : extension `postgis`,
  colonnes `geometry(Point/Polygon, 4326)`, **index GiST** et index `(machine_id, recorded_at)`.
  C'est exactement là où les abstractions ORM sont trop minces, donc je provisionne
  ça explicitement et de façon déterministe (`pnpm migrate`).
- **La logique spatiale tourne en base**, via le template `sql\`\`` paramétré de Drizzle
  (cf. `machines.service.ts` / `zones.service.ts`) :
  - dernière position : `DISTINCT ON` / `LATERAL` + `ST_X` / `ST_Y` ;
  - machines dans la zone : `ST_Within(dernière_position, zone)` ;
  - distance dans la zone : `ST_MakeLine` (trajectoire) → `ST_Intersection` (portion interne)
    → `ST_Length(::geography)` (mètres sur l'ellipsoïde).

## Gestion du temps réel

- `PositionsGateway` (`@nestjs/websockets` + socket.io) : le front charge l'état initial
  en REST puis s'abonne à l'event `position:update`.
- `SimulatorService` (`OnModuleInit` + `setInterval`) **rejoue les traces fournies en
  aller-retour (ping-pong)** : à chaque tick (1,5 s par défaut), chaque dameuse avance d'un
  point puis rebondit aux extrémités. Cela imite une dameuse qui dame une piste de haut en
  bas et **garde les machines dans leur secteur** (la requête « machines dans la zone » reste
  vivante). Chaque nouveau point est **inséré en PostGIS** (`recorded_at = now`) **puis poussé**
  par WebSocket → persistance et temps réel restent cohérents.
- Côté front, `useLiveMachines` met à jour les marqueurs **sans rechargement** ; les requêtes
  spatiales sont rafraîchies par polling court (2–3 s) pour refléter le mouvement.

## Décisions d'architecture

- **Structure du seed** : `{ zone: Polygon, machines: [{ id, name, positions: [{lat,lng,timestamp}] }] }`.
  Le seed (`src/seed/seed.ts`) est typé strictement sur ce format connu (interfaces TypeScript).
- Projection **WGS84 / EPSG:4326** partout ; distances en **mètres** via cast `::geography`.
- Le simulateur **prolonge** les traces (ping-pong) plutôt que de s'arrêter à la fin du jeu de données.
- CORS/WebSocket permissifs en dev (à restreindre via `CORS_ORIGIN` en prod).
- L'image `postgis/postgis` est amd64 : elle tourne sous émulation sur Mac Apple Silicon (OK pour un test).

## Pistes d'amélioration

- Tests : unitaires/e2e sur les requêtes spatiales (jeux de données contrôlés), tests du gateway.
- Validation des entrées (DTO + `class-validator` / `zod`) et gestion d'erreurs plus fine.
- Pousser aussi `machines-in-zone` / la distance par WebSocket plutôt que par polling.
- Fenêtre glissante / rétention des positions (la table grossit indéfiniment avec le simulateur).
- Auth + multi-domaine skiable, clustering de marqueurs, time-slider d'historique.
- CI (lint + build + tests) et image Docker du back.

## Stack

NestJS 11 · Drizzle ORM · PostgreSQL 16 + PostGIS 3.4 · socket.io · React 19 · Vite ·
Mapbox GL (`react-map-gl`) · Tailwind v4 · TypeScript.
