# Orca: los carriles de la Fase 4

Tres carriles de trabajo en paralelo, cada uno en su worktree de Orca, con su rama, su stack de Supabase y su PR. Quién posee qué lo dice
`docs/plan.yaml` (`dueno_de`, `migraciones`), y la guarda de CI `scripts/guardas/carriles.mjs` lo hace cumplir leyendo ese archivo **de la
base del PR**. `main` lo integra la persona, o el coordinador (`scripts/coordinador/coordinador.mjs`) con los pasos verdes y ámbar
con CI en verde; un paso rojo, sólo la persona. La preparación está en `docs/PREPARACION.md`.

| Carril | Quién                                                                                    | Qué                                                                                                                                                  | Rama       |
| ------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| A      | El piloto principal (`docs/PILOTO.md`): Opus, esfuerzo alto                              | Base: el núcleo de `cotizaciones`, el listado, la tarjeta, la plantilla, 4.15-5 a 4.19 y 4.28. El único que edita ESTADO, PLAN, DECISIONES, BITACORA | `a/…`      |
| B      | Piloto con coordinador (`PILOTO.md`): fórmula, diseño y tablas (4.20 a 4.23)             | Sus áreas y el compilador de la fórmula, archivo por archivo; migraciones `formula`, `diseno`, `tablas`                                              | `b/<paso>` |
| C      | Piloto con coordinador: papelera, marcar final, comprobantes y comentarios (4.24 a 4.27) | Sus áreas; migraciones `papelera`, `final`, `comprobantes`, `comentarios`                                                                            | `c/<paso>` |

B y C no editan los docs del A: escriben en `docs/pasos/<paso>/` (`bitacora.md`, `decisiones.md`) y el A los consolida con
`node scripts/coordinador/consolidar-docs.mjs` antes de su commit de docs. Los abre `scripts/piloto/auto-carriles.sh` o
`scripts/coordinador/abrir-carriles.sh`. Después de la Fase 4, el plan de la siguiente lo decide la persona.

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
| Carril C     | `*_importadora-c` | 54921 | 54922 | 54924  | 3300 | 3510 |

Cada stack de carril pesa ≈ 0,85 GB de RAM (sin Studio, imgproxy ni logs); los tres stacks y un e2e en cada carril llegaron a 19,6 GB
de 30. El candado de la base es uno por stack (`candado-base-<puerto>.lock`): los carriles corren e2e a la vez sin cruzarse.

## Carril A: el piloto

En su worktree: `bash scripts/piloto/arrancar.sh` (`docs/PILOTO.md`). El bucle exige una rama `a/…`, verifica cada paso y lo publica
con `scripts/piloto/publicar.sh`: empuja la rama sin forzar y abre su PR contra `main` (o le comenta el paso). Nunca integra. Las
compuertas llegan al celular como siempre.

## Carriles B y C: pilotos con coordinador

Cada uno toma sus pasos de `docs/plan.yaml` (`coordinador.mjs siguiente b|c`) y trabaja en una rama `<carril>/<paso>` con la skill `feature`;
cierra con `entregar` sin tocar ESTADO, PLAN, DECISIONES ni BITACORA (eso va a `docs/pasos/<paso>/`) y lo que necesite del núcleo o de
`src/shared` lo describe allí en «Necesita del carril A». El coordinador integra los pasos verdes y ámbar con CI en verde; los rojos, la persona.
Un carril no toca fuera de su `dueno_de`, `docs/` y `compartido` (donde agrega y edita, no borra); en `plan.yaml` sólo suma archivos de las
familias del compilador que crea (B). Un cambio a la guarda o al plan rige desde el PR siguiente. `docs/carriles/b.md` es para una sesión
del B sin coordinador.

## Reglas de los carriles

- **Push:** sólo la rama propia, sin forzar ni borrar (`git push -u origin <rama>`); nunca `main`; `gh pr merge` sólo en una sesión interactiva a la que la persona se lo pidió, nunca el piloto. Lo hace cumplir
  `.claude/hooks/bloquear-peligrosos.sh`; con `PILOTO=1`, ninguna sesión empuja (lo hace el bucle).
- **Migraciones:** una nueva por cambio, con `supabase migration new` (fecha real) y **posterior a la última de `main`**; ninguna
  aplicada se edita. Las de un carril que no es base llevan uno de sus dominios (`migraciones` en `docs/plan.yaml`) al principio del nombre
  (`<versión>_formula_….sql`); la de otro dominio, `cotizacion_…` o `cotizaciones_…`, la crea A. Lo hace cumplir la guarda de CI `scripts/guardas/carriles.mjs`.
- **Docs compartidos:** ESTADO, PLAN, DECISIONES y BITACORA, sólo el carril base (A); los otros, `docs/pasos/<paso>/`. `docs/MAPA.md` no se versiona: lo regeneran lefthook, el hook Stop
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

1. El PR con CI en verde: `Nivel 1`, `Carriles` y los `e2e` que tocaron. Revisar el diff y, si es de B o C, sus notas de `docs/pasos/<paso>/`.
2. Merge en GitHub. Si trae migraciones o funciones, `.github/workflows/demo.yml` las aplica a la demo (necesita la variable
   `DEMO_PROJECT_REF` y los secretos `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD`).
3. Si era de B o C: pasar sus notas a ESTADO, PLAN, DECISIONES y BITACORA con `node scripts/coordinador/consolidar-docs.mjs` (el carril A, en su próximo commit de docs).
4. Avisar al otro carril que traiga `main`.

## La demo

`bash scripts/demo/restaurar.sh` la deja de cero: respaldo, reset con las migraciones, funciones, Auth y los datos de ejemplo (lee
`.env.demo`; `docs/ENTORNOS.md`). `--local` hace lo mismo con el stack del worktree en el que se corre.

## Si se acaba el uso (Max 5x)

1. Primero se paran B y C: cerrar sus sesiones en Orca (el trabajo queda en su rama).
2. El piloto duerme solo hasta la hora del límite y retoma (`docs/PILOTO.md`, «Límite de uso»). Para pararlo entre pasos:
   `bash scripts/piloto/parar.sh`; retomarlo: `bash scripts/piloto/arrancar.sh`.
3. Con poco margen, sólo A: es el que da al B y al C lo que necesitan del núcleo.

## Quitar un carril

En su worktree: `bash scripts/worktree/quitar.sh` (baja el stack y borra su base, ≈ 6 s). Después, borrar el worktree en Orca.

## Primeros prompts

**Carril A** (worktree en `a/fase-4`): `bash scripts/worktree/preparar.sh` y después `bash scripts/piloto/arrancar.sh`. El piloto toma el
paso siguiente de `docs/PLAN.md`. Para una sesión a mano en el carril A:

> Eres el carril A de importadora (docs/ORCA.md). Lee docs/ESTADO.md y la fila siguiente de la Fase 4 en docs/PLAN.md, y hazla con la
> skill feature. Eres el único que edita ESTADO, PLAN, DECISIONES y BITACORA y que crea migraciones del núcleo. Cierra con
> entregar, empuja tu rama y abre o actualiza su PR contra main. Nunca integres.
