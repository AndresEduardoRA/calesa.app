# Orca: dos carriles

Dos carriles de trabajo en paralelo, cada uno en su worktree de Orca, con su rama, su stack de Supabase y su PR. `main` lo integra sólo
la persona, al aprobar un PR. La preparación (cómo se llegó aquí y lo medido) está en `docs/PREPARACION.md`.

| Carril | Quién                                                                                   | Qué                                                                                                | Rama  |
| ------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----- |
| A      | El piloto (`docs/PILOTO.md`): Opus, esfuerzo alto; planificador y auditor en Opus       | El resto de la Fase 4, después la 5 y la 6. El único que edita ESTADO, PLAN, DECISIONES y BITACORA | `a/…` |
| B      | Sesiones de Claude Code en Orca (Sonnet), con las mismas skills y reglas, sin el piloto | La Fase 7 (notificaciones primero), después la 8 sin repuestos. Anota en `docs/carriles/b.md`      | `b/…` |

Repuestos (Fase 8) empieza con la Fase 5 integrada: quién la toma y si `repuestos` pasa a los dominios de B se decide al cerrar la 5. La
Fase 9, al final, entre los dos.

## Abrir un carril (una vez)

1. En Orca, un worktree nuevo desde `main` con la rama `a/<tema>` o `b/<tema>`. Orca copia `.env.local` y `.env.demo`
   (`.worktreeinclude`) y enlaza `docs/referencias/cotizador-actual` (`orca.yaml`).
2. En el worktree: `bash scripts/worktree/preparar.sh` (saca el carril de la rama). Escribe `.env.carril`, levanta el stack del carril,
   arma `.env.local` con sus claves, resetea y siembra la demo, y regenera el mapa. ≈ 80 s. Se puede poner en Orca › Settings ›
   Repository › «Setup on worktree creation».
3. Desde ahí, en ese worktree: `pnpm dev`, `pnpm funciones`, `pnpm db:*` y `pnpm test:e2e <spec>` usan el stack del carril. **Nunca
   `supabase` suelto**: leería `config.toml` y caería en el stack de la principal.

| Stack        | Contenedores      | API   | Base  | Correo | App  | e2e  |
| ------------ | ----------------- | ----- | ----- | ------ | ---- | ---- |
| La principal | `*_importadora`   | 54621 | 54622 | 54624  | 3000 | 3210 |
| Carril A     | `*_importadora-a` | 54721 | 54722 | 54724  | 3100 | 3310 |
| Carril B     | `*_importadora-b` | 54821 | 54822 | 54824  | 3200 | 3410 |

Cada stack de carril pesa ≈ 0,85 GB de RAM (sin Studio, imgproxy ni logs); los tres stacks y un e2e en cada carril llegaron a 19,6 GB
de 30. El candado de la base es uno por stack (`candado-base-<puerto>.lock`): los dos carriles corren e2e a la vez sin cruzarse.

## Carril A: el piloto

En su worktree: `bash scripts/piloto/arrancar.sh` (`docs/PILOTO.md`). El bucle exige una rama `a/…`, verifica cada paso y lo publica
con `scripts/piloto/publicar.sh`: empuja la rama sin forzar y abre su PR contra `main` (o le comenta el paso). Nunca integra. Las
compuertas llegan al celular como siempre.

## Carril B: sesiones de Orca

Una sesión de Claude Code (Sonnet) en el worktree de B, con el primer prompt de abajo. Trabaja por pasos chicos con la skill `feature`,
cierra con `entregar` (sin ESTADO, PLAN, DECISIONES ni BITACORA: eso va a `docs/carriles/b.md`) y, al terminar una unidad, empuja su
rama y abre o actualiza su PR.

## Reglas de los dos

- **Push:** sólo la rama propia, sin forzar ni borrar (`git push -u origin <rama>`); nunca `main`, nunca `gh pr merge`. Lo hace cumplir
  `.claude/hooks/bloquear-peligrosos.sh`; con `PILOTO=1`, ninguna sesión empuja (lo hace el bucle).
- **Migraciones:** una nueva por cambio, con `supabase migration new` (fecha real) y **posterior a la última de `main`**; ninguna
  aplicada se edita. Las de B llevan su dominio al principio del nombre (`<versión>_notificaciones_….sql`) y sólo tocan agenda, chat,
  notificaciones, buscador o web; una de un dominio compartido la crea A. Lo hace cumplir la guarda de CI `scripts/guardas/carriles.mjs`.
- **Docs compartidos:** ESTADO, PLAN, DECISIONES y BITACORA, sólo A. `docs/MAPA.md` no se versiona: lo regeneran lefthook, el hook Stop
  y `preparar.sh`.
- **Al traer `main`** (después de que se integró el PR del otro carril): `git merge origin/main` en la rama, nunca rebase con push
  forzado. Si el otro carril integró una migración con versión posterior a una tuya todavía sin integrar, la tuya se vuelve a crear con
  `supabase migration new` (mismo contenido, versión nueva) y se borra la vieja: la guarda de orden lo exige.

## Verificación por niveles

- **Cada tarea** (local): el Nivel 1 de `.claude/rules/e2e.md` (lint, typecheck, test y los e2e dirigidos), y el Nivel 2 si toca un
  disparador.
- **Cada PR** (CI): Nivel 1, la guarda de carriles y los e2e dirigidos a lo tocado (`scripts/e2e-dirigidos.mjs`): el completo de
  escritorio si toca un disparador del Nivel 2 o lo que mueve a todos los specs; ninguno si no toca la app. Un PR con migraciones se
  verifica en local y en CI, nunca en su preview de Vercel (que usa la demo y no migra).
- **Cada noche** (CI, `schedule`): el completo de escritorio sobre `main`, si hubo commits.
- **Antes de cerrar una fase:** el completo con los dos proyectos (Actions › ci › Run workflow, `proyectos: ambos`) o
  `pnpm test:e2e:completo` en local.
- **Rigor máximo** (mutaciones, carreras, volumen, auditor) sólo en fórmulas del cotizador, dinero, RLS y permisos. La interfaz decide
  sus microdecisiones sola (`.claude/rules/ui.md`).

## Integrar (la persona)

1. El PR con CI en verde: `Nivel 1`, `Carriles` y los `e2e` que tocaron. Revisar el diff y, si es de B, sus notas de `docs/carriles/b.md`.
2. Merge en GitHub. Si trae migraciones o funciones, `.github/workflows/demo.yml` las aplica a la demo (necesita la variable
   `DEMO_PROJECT_REF` y los secretos `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD`).
3. Si era de B: pasar sus notas a ESTADO, PLAN, DECISIONES y BITACORA (o pedírselo al carril A en su próximo paso).
4. Avisar al otro carril que traiga `main`.

## La demo

`bash scripts/demo/restaurar.sh` la deja de cero: respaldo, reset con las migraciones, funciones, Auth y los datos de ejemplo (lee
`.env.demo`; `docs/ENTORNOS.md`). `--local` hace lo mismo con el stack del worktree en el que se corre.

## Si se acaba el uso (Max 5x)

1. Primero se para B: cerrar sus sesiones en Orca (el trabajo queda en su rama).
2. El piloto duerme solo hasta la hora del límite y retoma (`docs/PILOTO.md`, «Límite de uso»). Para pararlo entre pasos:
   `bash scripts/piloto/parar.sh`; retomarlo: `bash scripts/piloto/arrancar.sh`.
3. Con poco margen, sólo A: es el que desbloquea a B (Fase 5 → repuestos, migraciones compartidas).

## Quitar un carril

En su worktree: `bash scripts/worktree/quitar.sh` (baja el stack y borra su base, ≈ 6 s). Después, borrar el worktree en Orca.

## Primeros prompts

**Carril A** (worktree en `a/fase-4`): `bash scripts/worktree/preparar.sh` y después `bash scripts/piloto/arrancar.sh`. El piloto toma el
paso siguiente de `docs/PLAN.md`. Para una sesión a mano en el carril A:

> Eres el carril A de importadora (docs/ORCA.md). Lee docs/ESTADO.md y la fila siguiente de la Fase 4 en docs/PLAN.md, y hazla con la
> skill feature. Eres el único que edita ESTADO, PLAN, DECISIONES y BITACORA y que crea migraciones de dominios compartidos. Cierra con
> entregar, empuja tu rama y abre o actualiza su PR contra main. Nunca integres.

**Carril B** (worktree en `b/notificaciones`), una sesión de Sonnet en Orca:

> Eres el carril B de importadora. Lee docs/ORCA.md, docs/carriles/b.md, docs/ESTADO.md y la Fase 7 de docs/PLAN.md. Empieza por
> notificaciones: propón en docs/carriles/b.md una partición en pasos chicos (cada uno con su «terminado cuando» y sus e2e) y haz el
> primero con la skill feature. Tus dominios son agenda, chat, notificaciones, buscador y web; tus migraciones llevan el dominio al
> principio del nombre. No edites ESTADO, PLAN, DECISIONES ni BITACORA: anótalo en docs/carriles/b.md. Lo que necesite de otro dominio
> o de src/shared, descríbelo allí en «Necesita del carril A» y sigue con otra cosa. Verifica con el Nivel 1, cierra con entregar,
> empuja tu rama y abre o actualiza su PR contra main. Nunca integres.
