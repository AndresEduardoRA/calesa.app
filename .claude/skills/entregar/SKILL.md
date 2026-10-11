---
name: entregar
description: Cierra el trabajo actual de importadora — verificaciones, mapa, estado, bitácora y commit convencional.
---

# /entregar

1. `bash scripts/mapa.sh`, `pnpm lint`, `pnpm typecheck`, `pnpm test`; si tocaste `supabase/`,
   `pnpm db:probar`. Si algo falla, arréglalo o para y repórtalo: no se entrega trabajo rojo.
2. `docs/ESTADO.md`: mueve lo terminado a «Funcionando», anota lo descubierto y lo pendiente.
   Mantenlo bajo 80 líneas: lo que ya no es actual pasa a `docs/BITACORA.md`.
3. Una línea en `docs/BITACORA.md`: fecha, qué se hizo, en qué commit.
4. `git status` **en este turno** y commit con Conventional Commits (scopes válidos en
   `CLAUDE.md`). Si el mensaje necesita «y», son dos commits. Nunca `--no-verify`.
5. Reporta en tres líneas: qué quedó, qué sigue según `docs/PLAN.md`, qué decisión espera al
   usuario.
