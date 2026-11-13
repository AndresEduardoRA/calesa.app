# Flujo de trabajo

Cómo entra un cambio a `main`. El proyecto está terminado (fases 0 a 9) y vive de **actualizaciones frecuentes y chicas**: cada una es
una rama, un PR y un commit en `main`. Nadie integra a mano ni espera a nadie: el CI decide.

## Una actualización

1. **Rama** desde `main` al día: `git switch main && git pull --ff-only && git switch -c <tipo>/<tema>` (`feat/`, `fix/`, `chore/`,
   `docs/`, `refactor/`, `perf/`, `test/`). Una rama, un cambio: si el título necesita «y», son dos actualizaciones.
2. **Trabajo.** Lo pedido sale de la persona o de `docs/PENDIENTES.md`. Una pantalla o un caso de uso: skill `feature`. Mientras se
   trabaja corre lo barato solo: ESLint del archivo editado (hook `PostToolUse`) y, al parar, typecheck, las pruebas de lo tocado y las
   guardas (hook `Stop`).
3. **Entregar** (skill `entregar`): verificación local (abajo), docs al día, commits convencionales y
   `bash scripts/flujo/publicar.sh`, que empuja la rama, abre el PR con un título de commit convencional, le enciende el
   **auto-merge con squash** y espera al CI. Verde: GitHub lo integra, el guion vuelve a `main` al día y borra las ramas integradas.
   Rojo: dice qué job cayó; se arregla en la misma rama, se commitea y se vuelve a correr.
4. **Nada queda a medias.** Un PR que no pasó se arregla o se cierra en la misma sesión; si la sesión se corta, el PR sigue solo
   (el auto-merge no depende de ella) y la siguiente lo ve con `gh pr list`.

El commit que queda en `main` es el **título del PR** (`tipo(scope): descripción`, `commitlint.config.mjs`; el CI lo valida). El cuerpo
del PR cuenta qué cambió, por qué y cómo se verificó: es la bitácora. No hay otra.

## Qué se verifica y dónde

| Dónde                        | Qué corre                                                                                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Al editar (hook)             | ESLint del archivo; en `.sql`, `auth.uid()` envuelto y `security definer` con `search_path`                                                                                                  |
| Al parar (hook `Stop`)       | Árbol sucio: typecheck, ESLint y `vitest related` de lo cambiado, `scripts/guardas`, mapa. Árbol limpio: typecheck y mapa                                                                    |
| Al commitear (lefthook)      | ESLint y Prettier de lo que va en el commit, typecheck, `mapa.sh --check`, commitlint                                                                                                        |
| Al empujar SQL (lefthook)    | `db:probar` en modo rápido (≈ 1,5 min)                                                                                                                                                       |
| Antes de publicar (la skill) | `pnpm lint`, `pnpm typecheck`, `pnpm test`; con `supabase/` tocado: `pnpm db:reset`, `pnpm db:types`, `pnpm db:probar:rapido`; los e2e dirigidos a lo tocado (`pnpm test:e2e <spec>`)        |
| CI del PR (la autoridad)     | Nivel 1 (lint, tipos, mapa, título, orden de migraciones, `pnpm test` en 3 partes); «Base» si cambia código (reset, tipos sin diff, `db:probar` completo, privilegios, `db:lint`, advisors); |
|                              | los e2e dirigidos a lo tocado, o el completo de escritorio en 4 bloques si toca un disparador del Nivel 2 (`.claude/rules/e2e.md`). `Listo · todo en verde` los resume                       |
| Cada noche (CI)              | El e2e completo de escritorio sobre `main`, si hubo commits                                                                                                                                  |
| Antes de desplegar           | El completo con los dos proyectos: Actions › ci › Run workflow, `proyectos: ambos` (lo dispara la persona), o `pnpm test:e2e:completo` en local                                              |

Rigor máximo (mutaciones, carreras, volumen) sólo en fórmulas del cotizador, dinero, RLS y permisos. La interfaz decide sus
microdecisiones sola (`.claude/rules/ui.md`).

## GitHub

- `main` está protegida: sólo avanza por PR y exige el check **`Listo · todo en verde`** (el job `listo` de `ci.yml`, que resume a los
  demás). El repo sólo admite squash, con auto-merge y borrado de la rama al integrar. La persona, como administradora, puede saltarse
  la protección; una sesión no empuja `main` (`.claude/hooks/bloquear-peligrosos.sh`).
- La cuenta es la dueña del repo aunque la activa de la máquina sea otra: `publicar.sh` pide su token (`gh auth token --user <dueña>`)
  y nunca cambia la cuenta activa (`gh auth switch` es de la persona).
- Un e2e que pasa al reintentar en CI no pone el PR en rojo; queda anotado en el PR (`e2e/soporte/reporter-de-inestables.ts`). Sólo
  se arregla si cae dos noches seguidas en el completo.
- Disparar un workflow a mano (`gh workflow run`, el Nivel 3, las carreras) es de la persona.

## En paralelo

Dos actualizaciones a la vez van en dos worktrees (Orca, Claude Code o `git worktree add`), cada uno con su rama y su PR. Un worktree
que necesita base o e2e se vuelve un **carril** con `bash scripts/worktree/preparar.sh` (≈ 80 s): le da su pila de Supabase y sus
puertos (a, b o c: +100, +200, +300 sobre la principal; `docs/ENTORNOS.md` › «Pilas locales»). Ahí `pnpm dev`, `pnpm funciones`,
`pnpm db:*` y `pnpm test:e2e` usan su pila; nunca `supabase` suelto. Al terminar: `bash scripts/worktree/quitar.sh` y se borra el
worktree. La base local y el e2e de una pila son de una sesión a la vez (`scripts/candado.sh`).

Si dos PR tocan lo mismo, el segundo choca: `git merge origin/main` en su rama (nunca rebase con push forzado), se resuelve, se
commitea y se vuelve a publicar. Una migración que quedó antes de una ya integrada se crea de nuevo con
`pnpm exec supabase migration new` (el CI lo exige).

## Docs: qué se toca en cada actualización

| Doc                                            | Cuándo                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `docs/PENDIENTES.md`                           | Se borra la línea de lo que se cerró; se anota en una línea lo que se descubrió y no se hizo                  |
| La ficha `CLAUDE.md` del módulo                | Si cambió su contrato (qué entra, qué sale, una regla, una trampa). Dice lo que es, no cómo se llegó          |
| `docs/GLOSARIO.md`                             | Término nuevo                                                                                                 |
| `docs/DECISIONES.md`                           | Una decisión no obvia: una viñeta en su área. Si reemplaza a otra, se edita la que estaba                     |
| `docs/LECCIONES.md`                            | Una trampa que costó tiempo y volvería a pasar: la regla que la evita, en una línea                           |
| `docs/UX.md`, `COTIZADOR.md`, `RENDIMIENTO.md` | Si cambió la pantalla, la regla de cálculo o un presupuesto                                                   |
| `docs/ESTADO.md`                               | Sólo si cambia el estado del producto (algo nuevo funcionando, un verde que dejó de serlo). No en cada cambio |

Ningún doc lleva historia («se encontró X y se arregló»): eso es el PR. Lo que queda escrito es la regla que resultó.

## La base

- Una migración nueva por cambio; después `pnpm db:reset`, `pnpm db:types` y `pnpm db:probar` (`.claude/rules/migraciones.md`).
- **Aplastar:** cuando las migraciones pasan de unas cuarenta, o antes de un despliegue grande, `pnpm db:aplastar` las funde en una
  base nueva y comprueba que deja la misma base (esquema, ACL, policies, triggers, catálogo, jobs, buckets). Va en su propio PR. Lo
  que hay que hacer después en un proyecto remoto: `docs/DESPLIEGUE.md` › «Tras aplastar las migraciones».
- Producción (variables, secretos, `db push`) es de la persona: `docs/DESPLIEGUE.md`.

## La historia

Todo lo anterior al 2026-11-13 (el piloto con sus tres carriles, la bitácora, el plan por fases, las decisiones paso a paso y las 249
migraciones sueltas) está en la etiqueta **`fases-0-9`**: `git ls-tree -r --name-only fases-0-9 docs/` lista lo que había y `git show fases-0-9:<ruta>` lo
muestra (la bitácora, el plan, el archivo de docs, las decisiones paso a paso).
