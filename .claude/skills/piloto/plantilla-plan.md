# Plan del paso <N> — <título>

> Lo escribe el `planificador` en `.piloto/planes/<paso>.md`. Lo audita el `auditor`. Corto y concreto: lo que la persona revisaría antes de que se ejecute.
>
> - **Tope: 60 KB** medidos con `wc -c` (el del 4.13-3b pesó 87 KB). Un plan que no cabe es un paso que no cabe: se parte.
> - **La conducta se escribe una vez**, numerada (`C1…Cn`); archivos, pruebas y mutaciones la citan por número, no la vuelven a contar.
> - **Las respuestas al auditor van en `.piloto/planes/<paso>.respuestas.md`**, no aquí. El plan se corrige con `Edit`, nunca se reescribe entero.
> - Los prefijos: `Pn` las preguntas, `Vn` las precondiciones, `Cn` la conducta, `Mn` las mutaciones.

## Preguntas abiertas

De producto, de UX, de datos o de dependencias: **una por decisión**, `Pn · la pregunta · de 2 a 4 opciones, la recomendada primero`. Van arriba porque la persona las
lee primero. Si hay alguna, el paso termina en una compuerta (la de `producto` lleva cada `Pn` como una pregunta propia). Sin preguntas: «Ninguna».

## Paso y fila

El número, su cita de `docs/PLAN.md` (la fila, copiada) y el estado en que lo encuentra `docs/ESTADO.md`.

## Alcance y fuera de alcance

Qué entra, en una lista corta que cita la conducta (`C3`, `C4`), y aparte qué **no** entra aunque esté cerca (con el número del paso donde sí). Sin describir la conducta aquí.

## Partición

Si junta capas con verificación distinta (la base, `src/shared`, la pantalla): en qué pasos se parte, y **cómo se anota en `docs/PLAN.md`**. Si no se parte, por qué cabe
(en 60 KB y en hasta 3 commits de código).

## Precondiciones verificables

Lo que el plan da por cierto del código, de la base o de los docs, una por línea: `Vn · la afirmación · archivo:línea`. Es lo que el auditor contrasta con el repo; una
afirmación sin su `archivo:línea` no es una precondición, es una suposición, y se dice como tal.

## Conducta

Una regla por cambio de conducta: `Cn · la regla`. Una tabla vale cuando la conducta es una tabla (error → texto → salida). Lo que las secciones de abajo necesitan saber
de la conducta está aquí y en ningún otro lugar.

## Archivos

Una tabla: `ruta · capa (entities / infra / features / app / shared / supabase) · crea o toca · Cn`. Ninguno de más de 300 líneas.

## Nivel de verificación

- Salida de `node scripts/piloto/nivel.mjs <archivos>` (pegada): nivel, disparadores, si toca interfaz, si cambia `database.types.ts`.
- La cuenta `n de 3` de `node scripts/piloto/cuenta-e2e.mjs docs/BITACORA.md` y si este paso corre el completo.
- Los e2e **dirigidos** (por el texto tocado: `grep` en `e2e/`) y en qué proyectos.

## Pruebas que fallan primero

Una tabla: `archivo · prueba · Cn · dónde queda en rojo contra HEAD` (`.piloto/salidas/<paso>/`).

## Mutaciones

Sólo en un paso de rigor máximo (`.claude/rules/e2e.md` › «Pulido y rigor por tipo de paso»); en pantalla pura, «No aplica». Una tabla: `Mn · archivo de producto · qué se rompe · Cn · la prueba que debe caer`. Se hacen después de verde y se revierten con `cp` + `cmp`.

## Abiertos de `docs/PLAN.md` que toca

Cada abierto con su número y qué se hace con él (cerrar, dejar, mover).

## Seguridad y permisos

Claves de `permisos`, RLS, RPC, `security definer`, Vault. Nada que un nivel oculte. Si hay algo, es una compuerta `datos`.

## Rendimiento

Las filas de `docs/RENDIMIENTO.md` de cada lista que toca: tope, índice y presupuesto. Qué volumen se siembra para probar.

## Docs

`docs/PLAN.md`; `docs/ESTADO.md` **por sustitución, ≤ 60 líneas medido con `wc -l`**; `docs/BITACORA.md` con su marcador `e2e completo: sí|no (…)`; `docs/DECISIONES.md` con la fecha de
`TZ=America/La_Paz date +%F`; las fichas `CLAUDE.md` de lo que cambia; `docs/GLOSARIO.md` si hay un término nuevo; `docs/MAPA.md` por `bash scripts/mapa.sh`.

## Commits

**Hasta 3 commits de código y el de docs**, uno por intención, en orden, con su asunto (español, minúscula, ≤ 72 caracteres) y qué lleva cada uno. Si el plan necesita más,
el paso no cabe y se parte. El `fix` que pida la auditoría del informe va aparte y no cuenta.

## Modelo y esfuerzo sugeridos

`sonnet|opus` y `low|medium|high|xhigh`, y por qué.
