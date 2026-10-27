# Plan del paso <N> — <título>

> Lo escribe el `planificador` en `.piloto/planes/<paso>.md`. Lo audita el `auditor`. Corto y concreto: lo que la persona revisaría antes de que se ejecute.

## Paso y fila

El número, su cita de `docs/PLAN.md` (la fila, copiada) y el estado en que lo encuentra `docs/ESTADO.md`.

## Alcance y fuera de alcance

Qué entra y, aparte, qué **no** entra aunque esté cerca (con el número del paso donde sí).

## Partición

Si junta capas con verificación distinta (la base, `src/shared`, la pantalla): en qué pasos se parte, y **cómo se anota en `docs/PLAN.md`**. Si no se parte, por qué cabe.

## Archivos

Los que se crean y los que se tocan, por módulo y capa (`entities` / `infra` / `features` / `app` / `shared` / `supabase`). Ninguno de más de 300 líneas.

## Nivel de verificación

- Salida de `node scripts/piloto/nivel.mjs <archivos>` (pegada): nivel, disparadores, si toca interfaz, si cambia `database.types.ts`.
- La cuenta `n de 3` de `node scripts/piloto/cuenta-e2e.mjs docs/BITACORA.md` y si este paso corre el completo.
- Los e2e **dirigidos** (por el texto tocado: `grep` en `e2e/`) y en qué proyectos.

## Pruebas que fallan primero

Cada cambio de conducta, su prueba, y que se guarda **en rojo contra HEAD** (ruta de la salida en `.piloto/salidas/<paso>/`).

## Mutaciones

Una tabla: mutación (qué se rompe en el código de producto) → la prueba que debe caer. Se hacen después de verde y se revierten con `cp` + `cmp`.

## Abiertos de `docs/PLAN.md` que toca

Cada abierto con su número y qué se hace con él (cerrar, dejar, mover).

## Seguridad y permisos

Claves de `permisos`, RLS, RPC, `security definer`, Vault. Nada que un nivel oculte. Si hay algo, es una compuerta `datos`.

## Rendimiento

Las filas de `docs/RENDIMIENTO.md` de cada lista que toca: tope, índice y presupuesto. Qué volumen se siembra para probar.

## Docs

`docs/PLAN.md`; `docs/ESTADO.md` **por sustitución, ≤ 12.288 B medido con `wc -c`**; `docs/BITACORA.md` con su marcador `e2e completo: sí|no (…)`; `docs/DECISIONES.md` con la fecha de
`TZ=America/La_Paz date +%F`; las fichas `CLAUDE.md` de lo que cambia; `docs/GLOSARIO.md` si hay un término nuevo; `docs/MAPA.md` por `bash scripts/mapa.sh`.

## Commits

Uno por intención, en orden, con su asunto (español, minúscula, ≤ 72 caracteres) y qué lleva cada uno.

## Preguntas abiertas

De producto, de UX, de datos o de dependencias: **una por decisión**, `Pn · la pregunta · de 2 a 4 opciones, la recomendada primero`. Si hay alguna, el paso termina en una
compuerta (la de `producto` lleva cada `Pn` como una pregunta propia).

## Modelo y esfuerzo sugeridos

`sonnet|opus` y `low|medium|high|xhigh`, y por qué.
