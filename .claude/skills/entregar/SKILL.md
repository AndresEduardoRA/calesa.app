---
name: entregar
description: Cierra el trabajo actual de importadora — verificación, docs que toca el cambio, commits convencionales y el PR integrado en main con el CI en verde.
---

# /entregar

Una actualización está terminada cuando su PR quedó integrado en `main` (`docs/FLUJO.md`). En orden:

1. **Rama.** Si estás en `main`, crea la rama del cambio (`git switch -c <tipo>/<tema>`); el trabajo sin commitear viaja con ella.
2. **Verificar.** `bash scripts/mapa.sh`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. Si tocaste `supabase/`: `pnpm db:reset`,
   `pnpm db:types` y `pnpm db:probar:rapido`. Si tocaste una pantalla o su flujo: los e2e dirigidos (`pnpm test:e2e <spec>`; pide
   `pnpm funciones`). Si algo falla, arréglalo: no se entrega trabajo rojo.
3. **Docs que toca el cambio** (la tabla de `docs/FLUJO.md`): borra de `docs/PENDIENTES.md` lo que cerraste y anota en una línea lo que
   descubriste y no hiciste; la ficha del módulo si cambió su contrato; `GLOSARIO` si hay término nuevo; `DECISIONES` si hubo una
   decisión no obvia; `LECCIONES` si una trampa costó tiempo. `docs/ESTADO.md` sólo si cambió el estado del producto. Nunca historia.
4. **Commits.** `git status` en este turno y Conventional Commits (scopes en `CLAUDE.md`); un commit, un cambio. Nunca `--no-verify`.
5. **Publicar.** `bash scripts/flujo/publicar.sh` (con `--titulo '<tipo(scope): descripción>'` si la rama lleva más de un commit, y
   `--cuerpo <archivo.md>` con qué cambió, por qué y cómo se verificó). Empuja, abre el PR con auto-merge y espera al CI:
   - integrado → ya estás en `main` al día, con las ramas integradas borradas;
   - rojo → lee el job que cayó (`gh run view <id> --log-failed`), arregla en la misma rama, commitea y vuelve a correr el guion;
   - choca con `main` → `git merge origin/main`, resuelve, commitea y vuelve a correrlo.
6. **Reportar** en tres líneas: qué quedó en `main` (el PR), qué se anotó en `docs/PENDIENTES.md` y qué decisión espera a la persona.
