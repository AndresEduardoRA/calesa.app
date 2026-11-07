# 4.20-4a y 4.20-4b — el plan para el carril A

Copia del plan del B (sesión del 2026-11-07), con las respuestas de la compuerta `producto`; manda sobre todo lo que diga `.piloto/`, que no se versiona.
Las cuatro respuestas fueron las recomendadas: C1–C10 valen tal cual. P3 (y P2 como permiso) los vuelve a preguntar la compuerta `datos` del 4.20-4a; sin
`aprobado-4.20-4a` no se publica su SQL. Las rutas `.piloto/…` que se citan abajo son del worktree del B y pueden no existir donde se lea esto.

## Preguntas abiertas

Van a la compuerta `producto` de esta sesión, **en este orden: P1 → P2 → P5 → P6** (P6 depende de P2 y de P5; P5.2 choca con P2.1 y P2.2), una pregunta por `Pn`.
P2 es además de `datos` (permiso) y P3 sólo de `datos` (`security definer`): no van a `producto`; las lleva la compuerta `datos` del 4.20-4a con la respuesta de P2 ya
dada, y sin `aprobado-4.20-4a` no se publica su SQL. P4 se retiró (D1 ya lo decide).

- **P1 · Confirmar: el 4.20-4 es del carril A, como ya está anotado** (`docs/DECISIONES.md:2023`: «4.20-4 (vigencia y vehículo obligatorio, que escribe `ajustes_empresa`,
  del A)»). No reabre esa decisión: pregunta cómo lo recibe el A.
  1. **(recomendado)** **Del A, en dos pasos:** 4.20-4a (C1–C4 + C9) y 4.20-4b (C5–C8, `depende_de` el 4a y el 4.20). El B cierra hoy el 4.20 sin él (S1–S3). La
     pantalla pasa como pantalla pura (sin mutaciones ni informe auditado) y el rigor máximo queda en la base, la regla y la action.
  2. Del A, de una pieza (los 3 commits de código de antes): una entrega, pero toda la pantalla queda en rigor máximo (`.claude/rules/e2e.md` › «Pulido y rigor»).
  3. Reabrir `:2023`: el 4.20-4b al B, tras integrar el 4.20-4a. El 4.20 del B sigue abierto (`parcial: true`) y el 4.21 espera; nada nuevo lo pide.
     **Respuesta (2026-11-07):** 1, aprobada (del A en dos pasos, 4.20-4a y 4.20-4b).
- **P2 · ¿Quién cambia la vigencia y el vehículo obligatorio?** (D3 dice «lo cambia `cotizaciones.configurar`», que es una clave **por origen**, y estos dos ajustes valen para
  toda la empresa)
  1. **(recomendado)** `cotizaciones.configurar` **concedida para todos los orígenes** (la fila sin origen; el dueño la tiene, V15). Un ajuste de todos no lo cambia quien
     configura un origen.
  2. `cotizaciones.configurar` en **algún** origen, como los tonos y las tablas globales (V16). D3 al pie de la letra, pero quien configura un origen cambia cuándo vencen
     las cotizaciones de todos.
  3. `empresa.ajustes.gestionar`, la de Configuración › Empresa (lo que pide hoy `empresa_guardar_ajustes`, V3). Con P5 = 1, la entrada del hub y la pestaña «Ajustes»
     se abren también con esa clave (hoy la sección pide `equipo.roles.*` o `cotizaciones.configurar`, `seccion.ts:14`; `pestanas.ts:25-27`): cambia C6 y C7.
  4. Una clave nueva (`cotizaciones.ajustes.gestionar`), con su fila en `permisos` y en la matriz de Roles. Con P5 = 1, igual que la 3: el hub y «Ajustes» se abren
     también con ella (C6 y C7).
     **Respuesta (2026-11-07):** 1, aprobada (`cotizaciones.configurar` concedida en todos los orígenes). Como permiso, la confirma también la `datos` del 4.20-4a.
- **P3 · (sólo `datos` del 4.20-4a) ¿Una RPC nueva o la de Empresa?** Lo que ve la persona es igual en las dos: si otra guardó la fila entre abrir y guardar, el PT409 de
  siempre con «Recargar» (la misma versión que comparten formulario e íconos, V9; C5).
  1. **(recomendado)** Una RPC nueva, `empresa_guardar_ajustes_de_cotizacion()`, con sólo esas dos columnas y `p_actualizado_en_esperado` (C1).
  2. Sumar las dos a `empresa_guardar_ajustes()` (V3) con un permiso por clave dentro de la misma RPC: mezcla dos permisos en una función que hoy pide uno.
     **Respuesta:** pendiente de la compuerta `datos` del 4.20-4a (recomendada, 1).
- **P4 · (retirada)** Que cambiar la vigencia mueva las ya guardadas lo decide D1 (`docs/PLAN.md:41`, `docs/DECISIONES.md:863`: «Vencida» = `creado_en` + `vigencia_dias`
  de la empresa, al leer); el aviso de C5 es microdecisión. Congelarla por cotización sería reabrir D1: fuera de este paso.
- **P5 · ¿Dónde van?**
  1. **(recomendado)** Una pestaña nueva **«Ajustes»** al final de Configuración › Cotización (`?seccion=ajustes`), después de «Niveles de acceso» y «Fórmula»: lo que la fila
     del 4.20 pide y donde se configura el resto del cotizador. Al final, para que quien sólo configura la fórmula siga cayendo en «Fórmula» (V18).
  2. En Configuración › Empresa › «Políticas», junto a la retención y la limpieza (V10). **Choca con P2.1 y P2.2:** Empresa la abre sólo quien tiene `empresa.*`
     (`src/modules/empresa/CLAUDE.md:53`), así que quien configura el cotizador sin `empresa.*` no llegaría; sólo es coherente con P2 = 3.
  3. Arriba de la pestaña «Fórmula»: se repetiría en cada origen siendo uno solo para todos.
     **Respuesta (2026-11-07):** 1, aprobada (pestaña «Ajustes» al final de Configuración › Cotización).
- **P6 · (sólo con P5 = 1) ¿Quién ve la pestaña «Ajustes»?**
  1. **(recomendado)** Quien tiene `cotizaciones.configurar` en algún origen: la ve; la cambia sólo quien cumple P2. Los demás, los campos apagados y el motivo (con P2 = 1:
     «Cambiar estos ajustes pide configurar el cotizador en todos los orígenes.»), como Empresa: «lo que no puede editar, deshabilitado con el motivo» (V11).
  2. Sólo quien puede cambiarlos (P2): los demás no la ven.
     Con P2 = 3 o 4, la ve además quien tiene esa clave sin `cotizaciones.configurar` (P2.3, P2.4).
     **Respuesta (2026-11-07):** 1, aprobada (la ve quien tiene `cotizaciones.configurar` en algún origen; los demás, apagada con el motivo).

## Partición

**No cabe en el carril B** (V12, V13), y dentro del A se parte por capa de verificación: la base, la regla de permiso nueva y la action que la exige son rigor máximo
(`.claude/rules/e2e.md` › «Pulido y rigor»); el formulario, la pestaña y el hub son pantalla pura (sólo `features/*/components`, `pantallas/` y `src/app/`, sin datos ni
permisos nuevos: el permiso ya lo dio el 4a). Juntos, toda la pantalla pagaba mutaciones e informe auditado.

- **4.20-4a** · C1–C4 + C9 + su C10 · 3 commits de código y el de docs · rigor máximo, Nivel 1 + cadena db, sin interfaz.
- **4.20-4b** · C5–C8 + su C10 · 3 commits de código y el de docs · pantalla pura, Nivel 1 con `movil`.

Descartado: que el B lo haga llamando `formula_…` a la migración para que pase la guarda. La guarda mira sólo el nombre (`scripts/guardas/carriles.mjs:82-84`), pero la
migración escribe `ajustes_empresa`, tabla de `empresa` (`src/modules/empresa/CLAUDE.md:32`), y el dominio de una migración es el prefijo de sus tablas
(`.claude/rules/migraciones.md:16`): sería engañar a la guarda.

**Cómo se anota** (lo escribe la persona o el A al integrar; esta sesión lo deja en `docs/pasos/4.20-4/decisiones.md`), con P1 = 1:

- `docs/plan.yaml`: **el `4.20` queda de una pieza** y la anotación del 4.20-1 (`docs/DECISIONES.md:2024`, que lo partía en `4.20-1`…`4.20-4`) **no se aplica**: el
  coordinador ya lleva el `4.20` publicado con su PR (todas sus partes salieron con ese id) y el `4.21` depende de él (`plan.yaml:422`). Se cambia el `terminado` del
  `4.20` (`plan.yaml:419`) por «El ⚙ y revertir publican la N+1 desde la publicada sin pisar el borrador; Configuración › Cotización › Fórmula; el ⚙ en la hoja; cierra 4-36
  y la parte de 4-8 del ⚙ y de revertir; la vigencia y el vehículo obligatorio, al 4.20-4a y 4.20-4b (A)», y se suman dos ids:
  - `4.20-4a`, carril `a`, `depende_de` **el de hoy** (`['4.15-4', '4.15-5', '4.15-6c']`, como pide `:2024`: no toca nada del B), riesgo `rojo`, verificación
    `Nivel 1 + cadena db`, `modulos` de las filas 4a de «Archivos», `terminado`: «La base guarda la vigencia y el vehículo obligatorio con `cotizaciones.configurar` en todos
    los orígenes y su versión, y `empresa` los lee y los guarda por action».
  - `4.20-4b`, carril `a`, `depende_de: ['4.20-4a', '4.20']`: **cambia respecto de `:2024`** porque C6 edita `pestanas.ts` y `page.tsx` de
    `src/app/(app)/configuracion/cotizacion/`, que son del 4.20 del B (están en sus `modulos`); antes de integrarlo, chocaría con lo que el B deja en esos archivos. Riesgo
    `ambar`, verificación `Nivel 1`, `modulos` de las filas 4b de «Archivos», `terminado`: «La vigencia y el vehículo obligatorio se cambian en Configuración › Cotización › Ajustes».
- `docs/PLAN.md`, fila del 4.20: «Se partió en 4.20-1, 4.20-2 (a–c) y 4.20-3 (a–d), del B, y 4.20-4a y 4.20-4b (vigencia y vehículo obligatorio, **del A**)», y dos filas **4.20-4a** y
  **4.20-4b** que citan `docs/pasos/4.20-4/plan-del-a.md`.
- Con P1 = 2: un solo id `4.20-4`, `depende_de: ['4.20']`, riesgo `rojo`, `Nivel 1 + cadena db`. Con P1 = 3: el 4.20-4b con carril `b`.

## Precondiciones verificables

- V1 · `vigencia_dias integer not null default 7`, check 1–365, «nadie la escribe todavía (`empresa_actualizar` no la nombra): la configura el 4.20» ·
  `supabase/migrations/20261104155412_ajustes_vigencia_dias.sql:1-9`
- V2 · `vehiculo_obligatorio_al_cotizar`: «Sin pantalla hasta el 4.20 (Configuración › Cotización); lo cambia quien tiene cotizaciones.configurar» ·
  `supabase/migrations/20261028180656_base.sql:20241`
- V3 · `empresa_guardar_ajustes(p_cambios, p_actualizado_en_esperado)` pide `empresa.ajustes.gestionar`, y su `v_editables` no nombra ninguna de las dos (rechaza «El dato
  «%» no se cambia desde los ajustes de la empresa.»); `for update` + `_exigir_version(…, 'Otra persona cambió los ajustes de la empresa mientras los editabas.')` ·
  `base.sql:10003-10032`. Ninguna migración posterior la redefine (`grep empresa_guardar_ajustes supabase/migrations/` sólo da `base.sql`).
- V4 · Lo único que escribe hoy `vehiculo_obligatorio_al_cotizar` es un `update` por SQL de un e2e · `e2e/soporte/cotizar-guardar.ts:122-139`
- V5 · La guardada calcula «vence el» con la vigencia de hoy · `supabase/migrations/20261104155414_cotizacion_hoja_guardada.sql:200-201`
- V6 · El listado lee `vigencia_dias` en cada llamada · `supabase/migrations/20261105011347_cotizaciones_listado.sql:74`, `20261106102102_cotizaciones_listado_por_lead.sql:56`
- V7 · `cotizacion_crear` lee el ajuste al guardar y sin vehículo da «Elige el vehículo de la cotización.» (22023, `hint = 'vehiculo'`) · `base.sql:8929`, `base.sql:8942-8943`
- V8 · `cotizacion_hoja` lo entrega al abrir (`'vehiculo_obligatorio', coalesce(v_obligatorio, true)`) y la hoja lo usa para «Guardar» · `base.sql:9310-9313`,
  `src/modules/cotizaciones/entities/hoja.ts:224`, `src/modules/cotizaciones/features/hoja/hooks/use-guardar-la-hoja.ts:39`
- V9 · `ajustes_empresa` tiene `trg_actualizado_en` y `trg_auditar`; la lee `authenticated` (policy `using (true)`, grant `select`) · `base.sql:24271`, `base.sql:24443`,
  `base.sql:26037`, `base.sql:31421`. La ficha: «Los ajustes son una fila que editan dos cosas (formulario e íconos)» · `src/modules/empresa/CLAUDE.md:37`
- V10 · `AjustesEmpresa` no tiene ninguna de las dos (y `getAjustesParaEditar` lee `select('*')`) · `src/modules/empresa/entities/ajustes-empresa.ts:6-35`,
  `src/modules/empresa/infra/queries/ajustes.ts:35-48`; «Políticas» es `bloque-politicas.tsx` con `<Interruptor>` y `<Campo type="number">` ·
  `src/modules/empresa/features/empresa/components/bloque-politicas.tsx:24-84`
- V11 · `empresa/index.ts` no exporta ninguna lectura de esas columnas y `empresa/client.ts` sólo `guardarTipoCambio` · `src/modules/empresa/index.ts:1-31`,
  `src/modules/empresa/client.ts:1-5`; «lo que no puede editar, deshabilitado con el motivo» · `src/modules/empresa/CLAUDE.md:53`
- V12 · El `dueno_de` del B no incluye `src/modules/empresa/`; el A sí (y `src/app/`, `supabase/`) · `docs/plan.yaml:19-38` (A: `src/modules/empresa/` en su `dueno_de`), `docs/plan.yaml:41-…` (B)
- V13 · El B crea sólo migraciones `formula|diseno|tablas` (la guarda mira el nombre) · `docs/plan.yaml:43`, `scripts/guardas/carriles.mjs:82-84`; los `modulos` del 4.20
  no nombran `empresa` · `.piloto/hechos.json` › `asignado.modulos`
- V14 · `tiene_permiso(clave, null)` es verdadero con la clave en **cualquier** origen · `base.sql:17431-17439`; `mis_permisos()` da `origen_id` nulo para una concesión de
  todos · `base.sql:14314-14324`
- V15 · El dueño recibe todas las claves sin origen · `supabase/seed.sql:113`; `cotizaciones.configurar` es `por_origen` · `supabase/seed.sql:62`
- V16 · Los tonos (catálogo global) piden `assert_permiso('cotizaciones.configurar')` sin origen · `base.sql:18043`, `base.sql:18079`
- V17 · `origenesCon(permisos, clave)` da `'todos'` si una concesión no tiene origen · `src/shared/lib/permisos.ts:179-185`
- V18 · Pestañas `niveles` y `formula` en ese orden; la primera visible es la de por defecto · `src/app/(app)/configuracion/cotizacion/pestanas.ts:13-20,32-37`; el e2e
  «quien sólo configura la fórmula … cae en «Fórmula»» · `e2e/configuracion-cotizacion-formula.spec.ts:74-91`
- V19 · El hub fija permisos y descripción en su prueba · `src/app/(app)/configuracion/cotizacion/seccion.ts:8-15`, `seccion.test.ts:6-23`
- V20 · `datosO()` lanza con el mensaje si la lectura falla (el error de la ruta, con «Reintentar») · `src/shared/lib/errores.ts:31-36`; patrón de sección de servidor ·
  `src/app/(app)/configuracion/cotizacion/seccion-niveles.tsx:1-11`
- V21 · `ajustes_empresa` está en `TABLAS_ACOTADAS` (se lee sin `.limit(`) · `scripts/guardas/excepciones-de-escala.ts:8`
- V22 · `db:probar` corre una lista fija de `supabase/tests/` y después `areas/**` · `scripts/probar-schema.mjs:201-231`
- V23 · `permisos-enforcement.sql` exige que la clave aparezca entre comillas en una función, policy o vista · `supabase/tests/permisos-enforcement.sql:6-11`

## Conducta

### El 4.20-4a y el 4.20-4b (C1–C10; P2, P3, P5 y P6 en su recomendada)

El 4.20-4a hace C1–C4 y C9; el 4.20-4b, C5–C8; C10 tiene su parte en cada uno.

- C1 · **La RPC.** Migración `supabase/migrations/<versión>_empresa_ajustes_de_cotizacion.sql` (`pnpm exec supabase migration new`, del A). `public.empresa_guardar_ajustes_de_cotizacion(p_vigencia_dias integer, p_vehiculo_obligatorio boolean, p_actualizado_en_esperado timestamptz) returns timestamptz`, `security definer`, `set search_path = ''`, en este orden:
  1. `perform public.assert_activo();` y, si no `exists (select 1 from public.mis_permisos() m where m.clave = 'cotizaciones.configurar' and m.origen_id is null)`,
     `42501` «No tienes el permiso «cotizaciones.configurar» en todos los orígenes.» (P2; no `tiene_permiso()`, que acepta cualquier origen: V14);
  2. `p_vigencia_dias` nulo o fuera de 1–365: `22023` «La vigencia va de 1 a 365 días.», `hint = 'vigencia_dias'`; `p_vehiculo_obligatorio` nulo: `22023` «Falta decir si el
     vehículo es obligatorio.», `hint = 'vehiculo_obligatorio_al_cotizar'`;
  3. `select … from public.ajustes_empresa where id = 1 for update` y `_exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió los ajustes de la
empresa mientras los editabas.')` (P3: la versión y el texto de V3);
  4. `update` de las dos columnas y `actualizado_por = (select auth.uid())`, `returning actualizado_en`.
     `revoke all … from public, anon, authenticated`; `grant execute … to authenticated, service_role`. `comment on column` de las dos: «La cambia
     `empresa_guardar_ajustes_de_cotizacion()` (Configuración › Cotización › Ajustes, 4.20-4) con `cotizaciones.configurar` en todos los orígenes.». `empresa_guardar_ajustes()`
     no cambia (sigue rechazándolas). **El catálogo**, en la misma migración (dato de catálogo: `.claude/rules/migraciones.md:21`; la nube no corre el seed), como
     `20261031224500_cotizacion_guardar_pide_ver.sql:159-161`: `update public.permisos set descripcion = 'Fórmulas, constantes, tablas de referencia y plantilla (por origen);
en todos los orígenes, también la vigencia y el vehículo obligatorio', aplicado_en = 'formula_*, plantilla_*, tono_*, formula_para_cotizar, policy tablas_referencia,
empresa_guardar_ajustes_de_cotizacion' where clave = 'cotizaciones.configurar';` y la misma fila en `supabase/seed.sql:62` (descripción y `aplicado_en`; el seed pisa con `on conflict (clave) do update`, `seed.sql:106`: sin igualarlo, `db:reset`
     deja el texto viejo), para que quien
     asigna roles vea en la matriz que la clave sin origen mueve la vigencia de todas. Con P2 = 3 o 4, la descripción la ajusta la clave elegida (con P2 = 4, su fila nueva con
     `insert … on conflict (clave) do update`, como `20261106062752_cotizaciones_papelera_purgar.sql:13`).
- C2 · **La lectura.** `leerAjustesDeCotizacion(): Promise<Resultado<AjustesDeCotizacion>>` en `empresa/infra/queries/ajustes-de-cotizacion.ts` (`server-only`, `cache()`):
  `.from('ajustes_empresa').select('vigencia_dias, vehiculo_obligatorio_al_cotizar, actualizado_en').eq('id', 1).single()` (tabla acotada, V21); con error, el `Resultado` del
  error (nunca valores de fábrica: la pestaña muestra el error de la ruta, V20). Sale por `empresa/index.ts` (por `composicion.ts`).
- C3 · **Quién cambia** (`empresa/entities/ajustes-de-cotizacion.ts`): `AjustesDeCotizacion = { vigenciaDias: number; vehiculoObligatorioAlCotizar: boolean; actualizadoEn: string }`,
  `ajustesDeCotizacionDesde(fila)`, `VIGENCIA_MINIMA_DIAS = 1`, `VIGENCIA_MAXIMA_DIAS = 365`, `MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION` = «Cambiar estos ajustes pide
  configurar el cotizador en todos los orígenes.» y `puedeCambiarAjustesDeCotizacion(permisos)` = `origenesCon(permisos, 'cotizaciones.configurar') === 'todos'` (espejo de C1.1,
  V17). `actualizadoEn` viaja como el texto que dio la base, con sus microsegundos (nunca por `Date`).
- C4 · **La action** `guardarAjustesDeCotizacion` (`empresa/features/cotizacion/actions/`, esquema en `../schemas/`): entrada `{ vigenciaDias: z.int().min(1).max(365)
(mensajes «La vigencia va de 1 a 365 días.»), vehiculoObligatorioAlCotizar: z.boolean(), actualizadoEnEsperado: z.string().min(1) }`. Sin C3 sobre `ctx.permisos`:
  `fallo('sin_permiso', MOTIVO…)` antes de llamar a la base. Llama la RPC de C1 con exactamente esas tres claves; `PT409` → `conflicto`, `42501` → `sin_permiso`, `22023` con
  `hint` → error del campo. Bien: `revalidatePath(RUTAS.configuracionDeCotizacion)` y `{ actualizadoEn }`. Sale por `empresa/client.ts` con su tipo de entrada (regla de la
  raíz de `client.ts`, `.claude/rules/modulos.md`).
- C5 · **El formulario** `<AjustesDeCotizacion ajustes puedeCambiar />` (`empresa/features/cotizacion/components/ajustes-de-cotizacion.tsx`, `'use client'`), por
  `empresa/pantallas/configuracion-cotizacion.ts` (nuevo; sólo `src/app`). La sección lleva su `h2` «Ajustes» (como «Niveles de acceso», que busca
  `e2e/soporte/niveles.ts:113`) y el formulario va en un `<Bloque titulo="Vigencia y vehículo">` (`src/shared/ui/bloque.tsx`; `.claude/rules/ui.md:23`), el único y
  primario: nace abierto (sin `plegado`). Campos:

  | Campo                             | Control                                                   | Ayuda                                                                                                                         |
  | --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
  | «Vigencia (días)»                 | `<Campo type="number" inputMode="numeric" min=1 max=365>` | «Cuántos días vale una cotización desde el día en que se creó. Cambia también cuándo vence cada cotización ya guardada.» (D1) |
  | «Vehículo obligatorio al cotizar» | `<Interruptor>`                                           | «Encendido, toda cotización pide su vehículo. Apagado, una preventa se guarda sin vehículo; una final siempre lo pide.»       |

  «Guardar» / «Guardando…» con `useAction`; mientras guarda, campos y botón apagados (el `Interruptor` con `disabled` a mano: `src/shared/CLAUDE.md` › «Ojo»). Entró:
  aviso «Guardaste los ajustes de cotización.» y el formulario se vuelve a montar con `key` = `actualizadoEn` (los valores, los guardados). Falló: los valores quedan;
  un error de campo va junto al campo y el foco a él; el conflicto, `avisarError()` con «Recargar»; sin red, el aviso de `enviarAccion` sin perder lo tipeado. Sin
  `puedeCambiar`: los dos apagados, sin «Guardar», y el motivo de C3 bajo el título. Sin borrador (dos campos: `ui.md`). Un número se muestra con `formato.ts`.

- C6 · **La pestaña.** `PESTANAS` suma `{ clave: 'ajustes', titulo: 'Ajustes', permisos: ['cotizaciones.configurar'] }` **al final** (P5, P6). `page.tsx`: con `pestana ===
'ajustes'`, `<Suspense fallback={<EsqueletoFormulario bloques={1} campos={2} />}>` y `<SeccionAjustes puedeCambiar={puedeCambiarAjustesDeCotizacion(sesion.permisos)} />`
  (nuevo `seccion-ajustes.tsx`, Server Component: `datosO(await leerAjustesDeCotizacion())`, como `seccion-niveles.tsx`). `pestanas-de-cotizacion.tsx` no cambia (las
  claves le llegan por props). `?seccion=ajustes` sin la clave abre la primera de las suyas (ya lo hace `pestanaDe`).
- C7 · **El hub.** `SECCION_DE_COTIZACION.descripcion` = «La fórmula de cada origen, la vigencia y los niveles de acceso de la hoja.»; sus `permisos` no cambian.
- C8 · **Dónde se nota** (sin código nuevo): la vigencia mueve «Vencida» del listado, «vence el» de la guardada, la tarjeta y el PDF de todas, porque se calcula al leer
  (V5, V6). El vehículo obligatorio rige para la hoja que se abre después (V8); una abierta antes con el ajuste recién encendido y sin vehículo recibe al guardar el error de la
  base (V7) por el camino que ya existe.
- C9 · **Pruebas de la base** en `supabase/tests/empresa-ajustes-de-cotizacion.sql` (nuevo, en la lista de `scripts/probar-schema.mjs`, V22), un `-- @test` por bloque, cada uno
  en su transacción revertida, comparando valores exactos (`is distinct from`): T1–T8 de «Pruebas que fallan primero».
- C10 · **Docs** (sección «Docs»), con la ficha `src/modules/empresa/CLAUDE.md:24` corregida (S1.2 (4)) y la entrada nueva de `docs/GLOSARIO.md` «Ajustes de
  cotización» (término nuevo: el tipo `AjustesDeCotizacion` y la pestaña «Ajustes»).

## Archivos

| Ruta                                                                                              | Capa              | Crea/toca       | C      | Paso        |
| ------------------------------------------------------------------------------------------------- | ----------------- | --------------- | ------ | ----------- |
| `supabase/migrations/<versión>_empresa_ajustes_de_cotizacion.sql`                                 | supabase          | crea            | C1     | 4a          |
| `supabase/seed.sql` (la fila de `cotizaciones.configurar`, `:62`)                                 | supabase          | toca            | C1     | 4a          |
| `supabase/tests/empresa-ajustes-de-cotizacion.sql`                                                | supabase          | crea            | C9     | 4a          |
| `scripts/probar-schema.mjs` (una línea en la lista)                                               | scripts           | toca            | C9     | 4a          |
| `src/shared/types/database.types.ts`                                                              | shared (generado) | `pnpm db:types` | C1     | 4a          |
| `src/modules/empresa/entities/ajustes-de-cotizacion.ts` (+ `.test.ts`)                            | entities          | crea            | C3     | 4a          |
| `src/modules/empresa/entities/repositorios.ts` (el puerto de C4)                                  | entities          | toca            | C4     | 4a          |
| `src/modules/empresa/infra/queries/ajustes-de-cotizacion.ts`                                      | infra             | crea            | C2     | 4a          |
| `src/modules/empresa/infra/ajustes-de-cotizacion.ts` (la RPC)                                     | infra             | crea            | C4     | 4a          |
| `src/modules/empresa/composicion.ts`, `index.ts`, `client.ts`                                     | módulo            | toca            | C2, C4 | 4a          |
| `src/modules/empresa/features/cotizacion/schemas/ajustes-de-cotizacion.ts`                        | features          | crea            | C4     | 4a          |
| `src/modules/empresa/features/cotizacion/actions/guardar-ajustes-de-cotizacion.ts` (+ `.test.ts`) | features          | crea            | C4     | 4a          |
| `src/modules/empresa/features/cotizacion/components/ajustes-de-cotizacion.tsx` (+ `.test.tsx`)    | features          | crea            | C5     | 4b          |
| `src/modules/empresa/pantallas/configuracion-cotizacion.ts`                                       | módulo            | crea            | C5     | 4b          |
| `src/modules/empresa/CLAUDE.md`                                                                   | ficha             | toca            | C10    | 4a y 4b     |
| `src/app/(app)/configuracion/cotizacion/pestanas.ts`, `pestanas.test.ts`                          | app               | toca            | C6     | 4b          |
| `src/app/(app)/configuracion/cotizacion/page.tsx`                                                 | app               | toca            | C6     | 4b          |
| `src/app/(app)/configuracion/cotizacion/seccion-ajustes.tsx`                                      | app               | crea            | C6     | 4b          |
| `src/app/(app)/configuracion/cotizacion/seccion.ts`, `seccion.test.ts`                            | app               | toca            | C7     | 4b          |
| `e2e/configuracion-cotizacion-ajustes.spec.ts`                                                    | e2e               | crea            | C5–C8  | 4b          |
| `docs/pasos/4.20-4/plan-del-a.md`, `decisiones.md`, `bitacora.md`                                 | docs              | crea            | S1     | esta sesión |

Ninguno pasa de 300 líneas (el más grande, el componente, ≈ 120). `page.tsx` hoy 62 líneas.

## Nivel de verificación

`node scripts/piloto/nivel.mjs` (medido hoy):

- **4.20-4a** (migración, `seed.sql`, la prueba SQL, `probar-schema.mjs`, `database.types.ts`, `entities/`, `infra/`, entradas, `features/cotizacion/{schemas,actions}`, la
  ficha): `{"nivel":1,"disparadores":[],"toca_interfaz":false,"interfaz":[],"database_types":true,…}` → **Nivel 1 + cadena db** (`db:reset`, `db:types`, `db:probar`,
  `db:lint`), e2e sólo en `escritorio`.
- **4.20-4b** (el componente, `pantallas/configuracion-cotizacion.ts`, la ficha, `pestanas.ts`, `page.tsx`, `seccion-ajustes.tsx`, `seccion.ts`, el spec):
  `{"nivel":1,"disparadores":[],"toca_interfaz":true,"interfaz":[…6 archivos…],"database_types":false,…}` → **Nivel 1**, e2e en `escritorio` y `movil`.

`node scripts/piloto/cuenta-e2e.mjs docs/BITACORA.md`: `{"n":0,"de":3,"el_siguiente_corre_completo":false}` (el último, 4.24-2): **sin completo**.

**e2e dirigidos**, cada uno por lo que lo alcanza de verdad (el grep de «La fórmula de cada origen» y de «Otra persona cambió los ajustes» en `e2e/` no da archivos; la
descripción del hub la fija `seccion.test.ts`, V19). Sin funciones edge (`E2E_SIN_FUNCIONES=1`).

| Paso | Spec                                                                                                                          | Por qué                                                                                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4a   | `empresa-guardado.spec.ts`, `empresa.spec.ts`                                                                                 | Configuración › Empresa importa `empresa/index.ts` y `composicion.ts`, que cambian; `empresa_guardar_ajustes()` sigue rechazando las dos columnas (T5)           |
| 4b   | `configuracion-cotizacion-ajustes.spec.ts` (nuevo)                                                                            | E1–E4                                                                                                                                                            |
| 4b   | `configuracion-cotizacion-formula.spec.ts`                                                                                    | V18: con «Ajustes» al final, quien sólo configura la fórmula sigue cayendo en «Fórmula»                                                                          |
| 4b   | `configuracion-cotizacion-niveles-permisos.spec.ts`                                                                           | qué pestañas ve cada rol: la lista suma «Ajustes»                                                                                                                |
| 4b   | `configuracion-cotizacion-niveles{,-casos}.spec.ts`, `configuracion-cotizacion-formula-{publicar,revertir,descartar}.spec.ts` | `page.tsx` suma su rama de pestaña y `PESTANAS` un elemento: las secciones de hoy se siguen abriendo                                                             |
| 4b   | `configuracion-cotizacion-niveles-200.spec.ts`                                                                                | abre `?seccion=niveles` al 200 % (`abrirNiveles`, `e2e/soporte/niveles.ts:111-114`): la barra pasa a tres pestañas y no puede tapar la lista ni su «⋯»           |
| 4b   | `configuracion-200.spec.ts`, `configuracion-200-capturas.spec.ts`                                                             | visitan `/configuracion` (la tarjeta del hub, con la descripción más larga) y `?seccion=niveles` (la barra de tres) al 200 % (`configuracion-200.spec.ts:63,97`) |

Fuera, con motivo: `cotizar-hoja.spec.ts` (el ajuste lo escribe por SQL, `e2e/soporte/cotizar-guardar.ts:122-139`, y ni el 4a ni el 4b tocan ese camino; lo nuevo, hoja
sin vehículo tras apagarlo en la pestaña, es E4).

## Pruebas que fallan primero

Contra HEAD, guardadas en `.piloto/salidas/4.20-4a/` y `…/4.20-4b/` como `rojo-head-*.txt` (con la nota de `e2e-contra-head-con-tests-nuevos`: apartar `src/` con `tar`
si el build ve tipos nuevos). Del 4a: T1–T8 y los Vitest de `entities/` y de la action; del 4b: el componente, `pestanas.test.ts`, `seccion.test.ts` y E1–E4 (su HEAD ya
tiene el 4a: el rojo es «no hay pestaña»).

| Archivo                                                      | Prueba                                                                                                                                                       | C             | Rojo contra HEAD                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | -------------------------------------------------------------------- |
| `supabase/tests/empresa-ajustes-de-cotizacion.sql`           | T1 una asesora con `cotizaciones.configurar` en un solo origen recibe 42501 y la fila no cambia; con la clave sin origen, cambia                             | C1.1          | la función no existe                                                 |
| ″                                                            | T2 la dueña cambia los dos: valores exactos, `actualizado_en` se mueve, `actualizado_por` = ella, devuelve la versión nueva                                  | C1.4          | ″                                                                    |
| ″                                                            | T3 con la versión de antes: PT409 con el texto de V3; con nula: «Falta la versión…»                                                                          | C1.3          | ″                                                                    |
| ″                                                            | T4 0, 366 y nulo: 22023 con `hint = 'vigencia_dias'`; vehículo nulo: 22023 con su `hint`; nada cambia                                                        | C1.2          | ″                                                                    |
| ″                                                            | T5 `empresa_guardar_ajustes('{"vigencia_dias": 9}')` sigue rechazándola                                                                                      | C1            | verde contra HEAD (guarda que no se mezclen; no es rojo a propósito) |
| ″                                                            | T6 con `vigencia_dias` = 30, `cotizacion_hoja_guardada` de una de hace 10 días dice `vencida = false`; con 7, `true` (C8, retroactivo)                       | C1, C8        | ″ (rojo: la función)                                                 |
| ″                                                            | T7 una cuenta bloqueada (`assert_activo`) recibe su error antes del permiso                                                                                  | C1.1          | ″                                                                    |
| ″                                                            | T8 la fila `cotizaciones.configurar` de `permisos`: `aplicado_en` nombra `empresa_guardar_ajustes_de_cotizacion` y la descripción, «la vigencia» (tras seed) | C1 (catálogo) | da la de hoy                                                         |
| `src/modules/empresa/entities/ajustes-de-cotizacion.test.ts` | sólo con la clave sin origen; con orígenes, no; sin la clave, no; `ajustesDeCotizacionDesde`                                                                 | C3            | el módulo no existe                                                  |
| `…/actions/guardar-ajustes-de-cotizacion.test.ts`            | sin C3 no llama al repositorio y da `sin_permiso`; manda exactamente las tres claves (`toStrictEqual`); 367 lo rechaza el esquema                            | C4            | ″                                                                    |
| `…/components/ajustes-de-cotizacion.test.tsx`                | sin `puedeCambiar`: apagados, sin «Guardar» y el motivo; con conflicto los valores tipeados quedan; mientras guarda, el interruptor apagado                  | C5            | ″                                                                    |
| `src/app/(app)/configuracion/cotizacion/pestanas.test.ts`    | con `cotizaciones.configurar` en un origen: `['formula', 'ajustes']`; con todo: `['niveles', 'formula', 'ajustes']`                                          | C6            | da `['formula']`                                                     |
| `…/seccion.test.ts`                                          | la descripción nueva                                                                                                                                         | C7            | da la de hoy                                                         |
| `e2e/configuracion-cotizacion-ajustes.spec.ts`               | E1 la dueña pone 30 días y apaga el vehículo: aviso, SQL con los valores, recargar los muestra; `afterAll` restaura los dos                                  | C5, C6        | no hay pestaña                                                       |
| ″                                                            | E2 quien configura un origen ve «Ajustes» con los valores apagados y el motivo, y cae en «Fórmula» al entrar                                                 | C5, C6        | ″                                                                    |
| ″                                                            | E3 cambiar `actualizado_en` por SQL entre abrir y guardar: «Recargar», lo tipeado queda; tras recargar, guarda                                               | C5            | ″                                                                    |
| ″                                                            | E4 con el vehículo apagado, la hoja nueva no pide vehículo para «Guardar» (el texto de `use-guardar-la-hoja.ts`)                                             | C8            | ″                                                                    |

## Mutaciones

Sólo el 4.20-4a (rigor máximo: permiso, `security definer`, migración). El 4.20-4b es pantalla pura: sin mutaciones (`.claude/rules/e2e.md` › «Pulido y rigor»); que
«Ajustes» vaya al final lo fijan `pestanas.test.ts` y E2. Tras verde, cada una con `cp` + `cmp` para revertir; las de SQL en el arnés de transacción contra PG17.

| M   | Archivo                               | Qué se rompe                                                                       | C    | Debe caer                     |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------- | ---- | ----------------------------- |
| M1  | migración                             | quitar el chequeo de permiso                                                       | C1.1 | T1                            |
| M2  | migración                             | `tiene_permiso('cotizaciones.configurar')` en vez de `origen_id is null`           | C1.1 | T1 (la de un origen cambia)   |
| M3  | migración                             | quitar `_exigir_version`                                                           | C1.3 | T3                            |
| M4  | migración                             | `between 0 and 365`                                                                | C1.2 | T4                            |
| M5  | migración                             | `grant execute … to anon`                                                          | C1   | `privilegios-de-anon.sql`     |
| M6  | `ajustes-de-cotizacion.ts` (entities) | `puede(permisos, 'cotizaciones.configurar')`                                       | C3   | su test (con orígenes, no)    |
| M7  | la action                             | quitar el `puede`                                                                  | C4   | «no llama al repositorio»     |
| M8  | la action                             | mandar una cuarta clave (`vehiculoObligatorio` además de `p_vehiculo_obligatorio`) | C4   | «exactamente las tres claves» |
| M9  | la action                             | no mandar `p_actualizado_en_esperado`                                              | C4   | «exactamente las tres claves» |
| M10 | migración                             | quitar el `update public.permisos` del catálogo                                    | C1   | T8                            |

## Abiertos de `docs/PLAN.md` que toca

Ninguno lo cierra el 4.20-4. Lo que el `terminado` del 4.20 nombra (`docs/PLAN.md:282`, `docs/plan.yaml:419`): **4-36** cerrado (4.20-1); **4-8**, la parte del ⚙ y de
revertir cerrada (4.20-1), la del borrador al 4.21 (P2 del 4.20-1); **4-33** (`docs/pasos/4.20-3d/decisiones.md` dice que no lo cierra), **4-19** y **4-20** al A; **5a-29** y
**5a-30** a la Fase 9; **4-30** al 4.22. Los siete siguen con «(4.20)» en `docs/PLAN.md:341-551` porque el B no edita PLAN: S1 repite el pedido para que el A los mueva.
Con eso y P1 = 1, el 4.20 del B queda terminable hoy (`parcial: false`); sin reescribir el `terminado`, ningún trozo del B lo cumple al pie de la letra.

## Seguridad y permisos

- Una RPC `security definer` nueva (C1) con `search_path = ''`, todo calificado, `(select auth.uid())`, revoke de `public, anon, authenticated` y grant explícito: compuerta
  **`datos`** del 4.20-4a (con P2 ya contestada y P3). El 4.20-4b no suma permiso ni dato: usa `puedeCambiarAjustesDeCotizacion()` del 4a.
- El catálogo de `cotizaciones.configurar` dice lo que ahora mueve (C1, T8, M10): quien asigna roles lo ve en la matriz.
- Sin clave nueva (P2 = 1); la decisión «en todos los orígenes» es nueva en la base (hoy `tiene_permiso()` sin origen es «en alguno»): va a `docs/DECISIONES.md` y la prueban
  T1, M2 y M6.
- Sin policy ni RLS nuevas: `ajustes_empresa` sigue de sólo lectura para `authenticated` (V9). `trg_auditar` registra el cambio.
- Nada de niveles ni de dinero; ninguna credencial.

## Docs

**El 4.20-4a y el 4.20-4b (C10), del A.** Los dos: `docs/ESTADO.md` por sustitución, ≤ 60 líneas con `wc -l`; `docs/BITACORA.md` con `e2e completo: no (4.20-4a, …)` /
`(4.20-4b, …)`; `MAPA` por `bash scripts/mapa.sh`. Además:

- **4a:** `docs/PLAN.md` (la fila del 4.20, las del 4.20-4a y 4.20-4b, y los siete abiertos movidos) y `docs/plan.yaml` («Partición»), si no los anotó la persona al
  integrar el 4.20; `docs/DECISIONES.md` (fecha de `TZ=America/La_Paz date +%F`): P1, P2, P3, P5 y P6 y «un ajuste de toda la empresa del cotizador pide la clave en todos
  los orígenes»; `src/modules/empresa/CLAUDE.md`: «Sale» con `leerAjustesDeCotizacion()` y `client.ts` con `guardarAjustesDeCotizacion`, «RPC» con la nueva, y la línea `:24`
  corregida («`AjustesEmpresa` (fila entera con versión, sin `vigencia_dias` ni `vehiculo_obligatorio_al_cotizar`: los lee `AjustesDeCotizacion`…)»); `docs/GLOSARIO.md`:
  «**Ajustes de cotización** — `AjustesDeCotizacion` / pestaña «Ajustes» de Configuración › Cotización: la vigencia y el vehículo obligatorio al cotizar, las dos columnas de
  `ajustes_empresa` que valen para todas las cotizaciones; los cambia `cotizaciones.configurar` en todos los orígenes.».
- **4b:** `docs/UX.md`: una sección «Cotización: ajustes (estados propios)» tras la de la fórmula (C5, C6, C8); la ficha: «Sale» con `pantallas/configuracion-cotizacion.ts`
  y «Ojo» («`vigencia_dias` (…) sin interfaz» pasa a «se cambia en Configuración › Cotización › Ajustes»); `docs/GLOSARIO.md`, en «Vigencia» y «Vehículo obligatorio al
  cotizar» (`:207`, `:212`): dónde se cambian.

## Commits

**El 4.20-4a** (3 de código y el de docs, uno por intención; la ficha va en el commit que cambia lo que ella dice, `.claude/rules/modulos.md`):

1. `feat(db): guardar los ajustes de cotización por rpc` — la migración (C1, con el catálogo), `seed.sql`, `database.types.ts`, el SQL de C9 y su línea en `probar-schema.mjs`.
2. `feat(empresa): leer los ajustes de cotización` — C2 y, de C3, el tipo `AjustesDeCotizacion` y `ajustesDeCotizacionDesde`, con su test, `composicion.ts`, `index.ts` y la ficha («Sale», `:24`).
3. `feat(empresa): guardar los ajustes de cotización` — de C3, `puedeCambiarAjustesDeCotizacion` (quién los cambia) con su test, y C4: esquema, puerto, infra de la RPC, action con su test, `client.ts` y la ficha (`client.ts`, «RPC»).
4. `docs(docs): anotar el 4.20-4a` — C10 del 4a.

**El 4.20-4b** (3 de código y el de docs):

1. `feat(empresa): sumar el formulario de los ajustes de cotización` — C5 con su test, `pantallas/configuracion-cotizacion.ts` y la ficha («Sale»).
2. `feat(app): sumar la pestaña ajustes a configuración de cotización` — C6 y C7 (la descripción del hub anuncia la pestaña), `pestanas.test.ts`, `seccion.test.ts`.
3. `test(app): recorrer los ajustes de cotización` — `e2e/configuracion-cotizacion-ajustes.spec.ts` (E1–E4).
4. `docs(docs): anotar el 4.20-4b` — C10 del 4b.

Con P1 = 2 (de una pieza): 4a.1, 4a.2 + 4a.3 + 4b.1 en uno («`feat(empresa): sumar los ajustes de cotización`»), 4b.2 + 4b.3, y el de docs.

## Modelo y esfuerzo sugeridos

Esta sesión del B: `sonnet`, `low` (sólo notas y la copia literal de `plan-del-a.md`). El 4.20-4a: `opus`, `high`: una RPC `security definer` con una regla de permiso
nueva («en todos los orígenes»), mutaciones SQL y una versión compartida entre dos pantallas. El 4.20-4b: `sonnet`, `medium`: pantalla pura y chica.
