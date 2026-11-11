# flujos

Motor único de flujos: fases, transiciones, requisitos (documento | dato | espera), roles por fase y transición, reglas por flujo, jubilar/eliminar, revisión de coherencia y la RPC `cambiar_fase` que mueve vehículos y repuestos.

## Entra y sale

- Entra: configuración del dueño en `/configuracion/flujos` (un flujo por origen + el de repuestos); llamadas a mover desde `logistica` y `repuestos`.
- Sale hoy por `index.ts`: `leerFasesDeOrigen(origenId)` → `FaseResumen[]` (id, nombre, color, orden, inicial, final, activa; también las jubiladas). Por `client.ts`: el tipo `FaseResumen`. Lo consume `vehiculos` para mostrar la fase y filtrar por ella. Del área `mover` (6.01): `leerFlujoDeOrigen(origenId)` → `FlujoDeOrigen | null` (`flujoId`, `reglasActivas`, y por fase `notaObligatoria`, `permiteContenedor`, `permiteAduana`, `demoraDias`; error visible si una lista llega al tope) y `reglaActiva(flujo, regla)`; por `client.ts`, sus tipos y `reglaActiva`. Lo consume el panel de la unidad de `logistica`.
- Saldrá con su fase del plan (todavía no existe): `transicionesDisponibles()`, `previsualizarCambio()`, `cambiarFase()`, `cambiarFaseLote()`, `<BadgeFase>`. Lo consumirán `logistica`, `repuestos`, `web` (fases públicas).
- El flujo de repuestos lo garantiza una migración (`fases_flujo_de_repuestos`, 5.01-2): sin fases y con sus 7 reglas; las fases las siembra `seed.sql` o se crean en «Fases».
- Depende de: `origenes`.

## Archivos clave

- `entities/fase.ts` — `FaseResumen`, `fasesDesde()`. `infra/queries/fases.ts` — `getFasesDeOrigen()`. `areas/nucleo/composicion.ts`.
- Todavía no existen (fases 5 y 6 del plan): `entities/transiciones.ts` — máquina de estados pura (espejo de `_puede_mover`), sólo para UX; la RPC es el candado.
- `entities/revisar.ts` — tipos de los avisos de `revisar_flujo()` (sin salida, inalcanzable, esperas cruzadas, roles que nadie tiene).
- `features/configuracion/` (núcleo, 5.02: `<PantallaDelFlujo>` —Server Component async, por `pantallas/configuracion.ts`—, el selector, la lista de fases y el inspector por fase; sólo la lista, sin «camino» ni «historial», D2). `entities/selector-de-flujos.ts` y `lectura-de-fase.ts` son los textos puros.
- La pantalla `/configuracion/flujos` (`src/app/(app)/configuracion/flujos/`) recibe de `src/app` los orígenes (`getOrigenes(true)`) y los roles (`leerRolesParaElegir()`): `flujos` no importa `origenes` ni `equipo`. `?fase=` lo lee `useFaseAbierta()`: un id que no es de una fase del flujo se ignora. `useVersionDelFlujo()` (dentro de `<ProveedorDelFlujo>`) entrega la `version` y `avisarConflicto()`; no sale por `client.ts` (D20).
- **Huecos** (`HuecosDelFlujo`, 5.02): `franjaDeRevisar`, `accionesDeLaLista`, `accionesDeFila`, `salidasDeFila` y `bloques.datos|salidas|requisitos` del inspector. Son **componentes de cliente** opcionales; cada área suma su línea en `src/app/(app)/configuracion/flujos/huecos.ts` al llenarlos. El inspector está registrado en `drawers-con-salida.ts` como `sinFormulario`: el paso que le ponga un formulario lo pasa a `formulario`.

## Áreas (5.02)

El módulo se parte por área, como `cotizaciones` (`scripts/guardas/areas-de-flujos.test.ts` lo vigila): el **núcleo** (`areas/nucleo/`, `entities/flujo.ts`, `entities/fase.ts`,
`infra/queries/`, `features/configuracion/`) y siete áreas con sus lugares: `fases`, `transiciones`, `requisitos`, `reglas`, `documentos`, `revisar` y `mover`. Un área vive en
`features|entities|infra/<área>/`, `areas/<área>/{index,client,composicion}.ts` y `pantallas/<área>.ts`; nace vacía y la llena su paso (`docs/plan.yaml`, `dueno_de`).

- `index.ts`, `client.ts` y `composicion.ts` de la raíz sólo hacen `export *` del núcleo y de cada área. Lo nuevo va en `areas/<su área>/`, nunca en la raíz.
- Un área importa lo suyo y el núcleo, nunca otra área; el núcleo no importa ningún área; adentro nadie importa la raíz. Lo que dos áreas comparten va al núcleo (lo decide el A).
- Un nombre exportado repetido entre dos áreas es un error de `tsc`.

## Tablas

`flujos`, `flujos_reglas`, `fases`, `fases_transiciones`, `fases_roles`, `fases_transiciones_roles`, `tipos_documento`, `fases_requisitos`, `historial_fases`.
RPC: `cambiar_fase`, `cambiar_fase_lote`, `previsualizar_cambio_fase`, `evaluar_requisitos`, `revisar_flujo`, `fase_crear`, `fase_guardar`, `fase_mover`, `fase_impacto`, `fase_eliminar`, `fase_reactivar`, `fuera_de_regla`, `unidad_llego_a_fase`, `claves_dato_requisito`.

## No se rompe

- `cambiar_fase` es la única que **mueve** (`fase_id` de vehículos e ítems de repuesto): secuencia viva → destino activo → transición o inicial → rol → requisitos bloqueantes → historial + nota + actividad, con `FOR UPDATE` y `PT409` si la fase esperada cambió.
- Una fase con historial no se elimina: se jubila (`activa = false`) y sale de los destinos. `fase_eliminar(p_fase, p_actualizado_en_esperado)` (5.01-2) toma la fase `for update` antes de contar (espera al cambio de fase en curso que entra o sale) y aplica `_fase_uso()`, la misma regla que lee `fase_impacto(p_fase)`: con unidades (también en la papelera) o historial jubila; sin ellos borra; con esperas → `23503`; la única inicial activa → `23514` (hint `es_inicial`); ya jubilada con uso → `22023`. Devuelve `{accion: jubilada|eliminada, version}`. Los conteos de `_fase_uso` llegan como tope + 1 (50 → 51): la app los pasa por `conteoAcotado(n, 50)`. Un cambio de fase hacia una fase que se está borrando recibe el `23503` de la FK.
- `fase_mover(p_fase, p_actualizado_en_esperado, p_despues_de)` renumera todas las fases del flujo (también las jubiladas) de 10 en 10, sin `orden` repetido, y sólo escribe `orden`. `fase_reactivar(p_fase, p_actualizado_en_esperado)` valida las reglas del flujo sobre la fila (`23514` con el campo en `hint`) y sólo escribe `activa`.
- Un requisito nace informativo; volverlo bloqueante muestra cuántas unidades quedan «fuera de regla» y pide confirmación.
- Las esperas se evalúan al entrar a la fase y nunca mueven en cascada.
- La versión de toda la configuración de un flujo es `flujos.actualizado_en`, y la mueve siempre hacia adelante el trigger `flujo_version()` (también dos veces en una transacción). Toda RPC de configuración (fases, y desde el 5.05, 5.07 y 5.10 transiciones, requisitos y reglas) llama `_flujo_para_editar(p_flujo uuid, p_actualizado_en_esperado timestamptz) returns flujos` antes de leer o escribir, y `_flujo_tocar(p_flujo uuid) returns timestamptz` al final, y devuelve ese valor. Firmas estables. El orden: inexistente → `PT409`; sin `puede_configurar_flujo` → `42501` (antes del candado: quien no puede no espera); `for no key update` (no frena el `key share` de las FK de `cambiar_fase`); versión distinta → `PT409`. `authenticated` no ejecuta los dos ayudantes.
- La versión cruza como texto ISO tal cual (microsegundos), nunca por un `Date` de JS: se quedaría en milisegundos y daría `PT409` en cada guardado.
- La configuración no se escribe directo: `authenticated` no tiene `insert` ni `update` sobre `fases` ni `update` sobre `flujos` (5.01-1). Crear y guardar una fase: `fase_crear(p_id, p_flujo, p_actualizado_en_esperado, p_datos)` y `fase_guardar(p_fase, p_actualizado_en_esperado, p_cambios)`, con lista cerrada de claves (`22023` con la clave en `hint`), validaciones con el campo en `hint`, reglas del flujo (`23514`) y únicos con mensaje humano (`23505`).

## Ojo

- Clave de dato nueva = caso en `_requisito_dato_cumplido()` **y** en `claves_dato_requisito()`, o la UI la ofrece y la RPC la rechaza.
- `fases.demora_dias`: NULL hereda `ajustes_empresa.demora_dias_default`, 0 apaga la alerta. Un solo lector del umbral (`alertas_demora`).
- El vehículo nace en la fase inicial **sólo si no hay nada que decidir** (`vehiculo_crear`: exactamente una inicial activa, que no pide nota, sin requisitos bloqueantes pendientes ni roles que excluyan a quien crea), con su fila en `historial_fases` (`de_fase_id` nulo). Si no, nace sin fase y la primera transición explícita (`cambiar_fase`) lo pone en una inicial. Entrar al nacer no pide `flujos.mover`.
- Un origen recién creado tiene flujo y reglas pero **ninguna fase**: `leerFasesDeOrigen()` devuelve una lista vacía.
