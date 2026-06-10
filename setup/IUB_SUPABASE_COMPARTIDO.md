# Supabase compartido IUB — todos los módulos

**Un solo proyecto** para ADM18, TGA04, TGA05 y TD.

| Campo | Valor |
|-------|-------|
| Proyecto | `adm18-latambox` |
| Ref | `nnrgxuzvjtweyzkdrech` |
| URL | `https://nnrgxuzvjtweyzkdrech.supabase.co` |
| Publishable key | `sb_publishable_-101J7EEEhv-C5kjosWGTg_657OtsBg` |

## Offerings por módulo

| Módulo | `MODULE_CODE` | `OFFERING_CODE` |
|--------|---------------|-----------------|
| ADM18 (LatamBox) | `ADM18` | `ADM18-2026-2` |
| TGA04 (NeuroBiz) | `TGA04` | `TGA04-2026-2` |
| TGA05 (NeuroBiz) | `TGA05` | `TGA05-2026-2` |
| TD | `TD` | `TD-2026-2` (cuando se active) |

## SQL (orden en el proyecto remoto)

1. `setup/gamification_unified.sql` — esquema base (una sola vez)
2. `setup/migrations/003_adm18_seed_and_rpc.sql`
3. `setup/migrations/004_adm18_roster_rpc.sql`
4. `setup/migrations/005_adm18_attendance_states.sql`
5. `setup/migrations/006_tga05_seed_and_periods.sql`
6. Seeds TGA04: `tga04-neurobiz/setup/migrations/003_tga04_seed_and_rpc.sql` (ya aplicado si hay 13+ periodos)

## Ejecutar SQL desde terminal (repo ADM18)

```bash
cd ProcesamientoInformacion
supabase link --project-ref nnrgxuzvjtweyzkdrech
supabase db query --linked -f setup/migrations/006_tga05_seed_and_periods.sql
```

## Frontend

Cada repo tiene `js/supabase-config.js` con la **misma URL/key** y su propio `MODULE_CODE` / `OFFERING_CODE`.
