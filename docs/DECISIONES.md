# Decisiones

Registro ligero. Una entrada por decisión que costaría entender de nuevo dentro de tres meses.
No documentes lo obvio.

Formato:

## AAAA-MM-DD — <decisión en una línea>

**Contexto:** qué problema había.
**Decisión:** qué se eligió.
**Alternativas:** qué se descartó y por qué.
**Consecuencia:** qué se vuelve fácil y qué se vuelve difícil por haber elegido esto.

---

## 2026-10-11 — Stack y andamiaje inicial

**Contexto:** proyecto nuevo, construido principalmente con asistencia de IA, que reemplaza al
prototipo `ip` (Next 16 + Supabase, 120 tablas, 20 features) cuyos problemas fueron mala
documentación, difícil de escalar y exceso de peticiones a la base.
**Decisión:** Next 16 App Router + React 19 + TypeScript 6 + Tailwind 4 + shadcn + TanStack Query +
Zod 4 + next-safe-action + nuqs + Supabase (SSR, RLS, Realtime, Storage, pg_cron, edge functions)
sobre Vercel Pro y Supabase Pro; pnpm; ESLint 10 con `eslint-plugin-boundaries` y typed linting,
Prettier, lefthook + commitlint, Vitest 4 + Playwright; hooks de Claude Code que bloquean (lint por
archivo, verificación al terminar, comandos peligrosos); memoria del proyecto por capas (mapa
generado, fichas por módulo, glosario, UX).
**Alternativas:** TypeScript 7 (10× más rápido, pero sin API del compilador: se pierde
`no-floating-promises`); Biome (sin boundaries, que es la regla central); husky (sin publicar desde
2024); Serwist para offline (el brief pide shell mínimo, no offline).
**Consecuencia:** el lint y los hooks bloquean antes que la revisión humana; el setup inicial es
más pesado y cambiar de arquitectura después cuesta más.

## 2026-10-11 — Nivel 2, monolito modular con 17 módulos

**Contexto:** más de diez áreas de negocio con datos y reglas propias; `ip` empezó en features
planas y a las 20 features ya nadie sabía qué dependía de qué.
**Decisión:** `src/modules/<dominio>/` con capas adentro (`features`, `entities`, `infra`) y API
pública en `index.ts`; dependencias en un solo sentido declaradas en `docs/ARQUITECTURA.md` y
verificadas por `scripts/mapa.sh --check`.
**Alternativas:** nivel 1 (features planas: lo que no escaló); nivel 3 (monorepo: no hay dos apps
Next que compartan código; la web pública es otro repo sobre el mismo Supabase).
**Consecuencia:** un nivel más de carpeta y una ficha por módulo; a cambio, cada módulo se puede
entender solo y el mapa muestra los ciclos.

## 2026-10-11 — Un motor de flujos para vehículos y repuestos, no tres copias

**Contexto:** `ip` tiene `vehicle_states`, `part_states` y `china_unit_states` con requisitos,
historial, documentos, transporte y RPC triplicados; agregar un origen (Corea) era copiar todo.
**Decisión:** `flujos` (uno por origen + uno de repuestos) con `fases`, `fases_transiciones`,
`fases_requisitos` (documento | dato | espera), roles por fase/transición, reglas por flujo;
`historial_fases`, `documentos`, `transportes`, `gastos`, `pagos`, `notas` con dos FK nullable
(`vehiculo_id` | `repuesto_id`) + CHECK; una única RPC `cambiar_fase`.
**Alternativas:** tabla `unidades` genérica con extensiones 1:1 (más indirección en PostgREST y
FKs menos claras); mantener tablas por origen (lo que se quiere dejar atrás).
**Consecuencia:** un origen nuevo es una fila y su flujo nace por trigger; a cambio, cada consulta
de hijas lleva `coalesce`/CHECK de dos columnas y las claves de dato de los requisitos son código
(`_requisito_dato_cumplido`).

## 2026-10-11 — Orígenes configurables: campos comunes como columnas, el resto en `atributos`

**Contexto:** el brief pide orígenes custom con layout propio (preconfig subasta/apibara o manual).
**Decisión:** `origenes_campos` describe el layout; `vehiculos` tiene columnas para lo común
(marca, modelo, año, VIN, lote, precio…) y `atributos jsonb` validado por trigger para lo
específico; los filtros se derivan de `origenes_campos.filtrable`.
**Alternativas:** todo jsonb (no se indexa ni se pone UNIQUE al VIN); una tabla por origen.
**Consecuencia:** agregar un campo no toca el schema; a cambio, un campo nuevo que necesite índice
o unicidad sí es migración (se promueve a columna).

## 2026-10-11 — La fórmula de cotización es un grafo versionado validado en SQL

**Contexto:** `ip` tiene 28 constantes por código y tres cotizadores escritos a mano; el brief
pide que un origen custom se cotice sin programar.
**Decisión:** `formulas.definicion` = lista ordenada de nodos (input, constante, tipo_cambio,
campo_vehiculo, bandera, tabla, tramo, calculo con operaciones cerradas), `params` para las
constantes, `buckets` por tipo de cambio; `validar_formula()` es el candado (sin ciclos, un único
total); versionado append-only con un borrador y una publicada por origen; snapshot de valores por
cotización; el motor TS en `entities/` evalúa; el ⚙ de una XCell publica N+1. Detalle en
`docs/COTIZADOR.md`.
**Alternativas:** expresiones libres (un motor de expresiones en SQL es un riesgo y una deuda);
constantes por código como `ip` (obliga a programar cada origen).
**Consecuencia:** el editor de fórmulas es trabajo de UI real (fase 4); a cambio, cotizar un origen
nuevo es configurar.

## 2026-10-11 — Permisos: catálogo fijo por código, roles libres, origen y alcance como parámetros

**Contexto:** el brief pide permisos «hasta el más mínimo detalle» y roles creados por el dueño.
**Decisión:** `permisos` se siembra por migración (una clave existe sólo si hay enforcement);
`roles_permisos(rol, clave, origen_id NULL=todos, alcance propios|todos)`; unión sin herencia;
dominancia (nadie otorga lo que no tiene); guardián diferido; `dueno` nunca pierde `equipo.*`.
**Alternativas:** permisos creables desde la UI (un toggle que no protege nada); claves por origen
(`flujos.china.mover`: no escala a orígenes custom).
**Consecuencia:** un permiso nuevo es una migración con su policy; a cambio, cada toggle de la
matriz protege algo de verdad.

## 2026-10-11 — Teléfono único global y enmascarado salvo cartera; leads en limbo

**Contexto:** el brief: el teléfono identifica al lead, «el que registra se lo queda», nadie más lo
ve; al dar de baja, los leads quedan «de nadie» hasta que alguien registre ese teléfono.
**Decisión:** índice único parcial entre leads vivos; `revoke select (telefono_principal)` y
`leads_vista` con `telefono_lead()` definer (enmascara incluso al dueño); limbo = sin filas
vigentes en `leads_asesores` (sin columna); `crear_lead` adopta y audita.
**Alternativas:** receptor obligatorio al dar de baja (lo que hace `ip`): el brief pide lo contrario.
**Consecuencia:** un lead en limbo es invisible para todos hasta que alguien tipea su teléfono;
el tablero debe mostrar cuántos hay para que no se olviden (fase 9).

## 2026-10-11 — Policies de la fila propia inline, no por función

**Contexto:** la prueba de humo falló: `INSERT … RETURNING` sobre `vehiculos` con policy SELECT
`puede_vehiculo(id)` — una función STABLE no ve la fila insertada en la misma sentencia.
**Decisión:** las policies de `vehiculos`, `leads` y `cotizaciones` se escriben sobre las columnas
de la fila; `puede_*(id)` queda para las tablas hijas.
**Consecuencia:** regla en `.claude/rules/migraciones.md`; una policy nueva sobre una tabla raíz
se escribe inline.

## 2026-10-11 — Embarques y contenedores son grupos; la DUI es entidad

**Contexto:** `ip` congeló `shipments` tras una auditoría: una tabla dueña de datos que había que
sincronizar con el transporte por vehículo.
**Decisión:** `transportes` 1:1 por unidad; embarque = grupo por `booking`, contenedor = grupo por
`contenedor` (vistas); `declaraciones_aduana` N:M con `removido_en`.
**Consecuencia:** editar un embarque es «aplicar a todos los del grupo», todo o nada con `PT409`.

## 2026-10-11 — Secretos fuera de la base; integraciones como interruptor

**Decisión:** `integraciones.config` nunca guarda claves; apibara, VAPID y el secreto de
revalidación de la web van en variables de entorno de Vercel y de las edge functions (o Vault).
**Consecuencia:** activar apibara es un switch en la UI + una variable en el entorno.

## 2026-10-11 — Monedas: base + N tipos de cambio nombrados, congelados por cotización

**Contexto:** «agnóstico al país»; Bolivia usa oficial y paralelo, otro país puede usar uno.
**Decisión:** `monedas`, `tipos_cambio(clave, moneda_de, moneda_a, valor)` con historial; la fórmula
declara `buckets` → clave de tipo de cambio; la cotización guarda `tipos_cambio` usados.
**Consecuencia:** cambiar el TC no mueve cotizaciones guardadas; el Modo Live oculta símbolos y
cifras en toda la app, no sólo en el cotizador.

## 2026-10-11 — Cola web: habilitado nace en false; prioridad ponderada

**Decisión:** conserva la ruleta de `ip` (puntero al asignar, pegajoso, cupo, reasignación fuera
de la cadena) y agrega `prioridad` (divide la carga abierta por prioridad+1) y `max_intentos`.
`habilitado` arranca apagado: un asesor entra a la rueda cuando alguien lo decide.
**Consecuencia:** publicar de menos; el tablero de la cola es la pantalla que lo enciende.

## 2026-10-11 — PDF de cotizaciones en servidor con `@react-pdf/renderer`

**Contexto:** `ip` usaba `jspdf` + `html-to-image` en el cliente: resultados distintos por navegador.
**Decisión:** la plantilla versionada (`plantillas_tarjeta.definicion`) se renderiza a PDF en un
route handler con `@react-pdf/renderer` (fuentes TTF), idéntico siempre; la tarjeta en pantalla
usa el mismo modelo de vista.
**Consecuencia:** una sola fuente de verdad del layout; no hay imágenes de cotización en el cliente.

## 2026-10-11 — Íconos PWA neutros hasta que la empresa cargue su logo

**Contexto:** producto white-label; no hay logo del producto, cada empresa carga el suyo.
**Decisión:** `public/` lleva un ícono neutro generado (glifo de tres tramos con flecha sobre el
primario `#3b5bdb`, ver `design/ICONOS.md`); en la fase 1, «Regenerar íconos» los produce desde
`ajustes_empresa.logo_ruta` y `manifest.ts` los prefiere cuando existen.
**Consecuencia:** no hay placeholders feos ni marca ajena; el despliegue se identifica al configurar.

## 2026-10-11 — Lo que se dejó fuera a propósito

Editor de artes (Konva) y directorio de contactos (`navieras` es un catálogo plano; proveedores
son texto en gastos): el usuario los marcó como fuera. Modo Live se conserva y además oculta los
símbolos de moneda. Comprobantes de venta internos se conservan.

## 2026-10-11 — Boundaries con la sintaxis v7, no la legacy

**Contexto:** `eslint-plugin-boundaries` 7.2 acepta la sintaxis vieja (`rules`, `mode: "full"`,
`${from.modulo}`) pero avisa que desaparece en la v8, y con patrones `**/*` + `partialMatch`
clasificaba mal los archivos que cuelgan directo de `infra/` (quedaban «unknown» y la regla no
los veía).
**Decisión:** elementos como carpetas (`src/modules/*/features`, sin `**/*`), `policies`, y
`captured: { modulo: "{{ from.element.captured.modulo }}" }` para «mismo módulo»; probado contra
un árbol de ejemplo con las cuatro violaciones típicas (features→infra, app→infra, tripas de otro
módulo desde features y desde infra) y las importaciones permitidas.
**Consecuencia:** el lint sí atrapa la regla central; el PROMPT 0 lo vuelve a probar en el repo real.

## 2026-10-11 — Migración base generada desde `supabase/schemas`

**Contexto:** las tablas vivían sólo en `supabase/schemas/` y las migraciones a mano arrancaban en
`000100_rbac.sql` dándolas por creadas. `supabase start` y `supabase db reset` aplican únicamente
`migrations/`: la base local no levantaba (`type public.alcance_permiso does not exist`).
`pnpm db:probar` no lo veía porque aplica `schemas/` y `migrations/` por su cuenta.
**Decisión:** `scripts/esquema-base.mjs` (`pnpm db:base`) concatena los `schema_paths` de
`config.toml`, en su orden, en `migrations/20261011000000_esquema_base.sql`. Ese archivo es
generado y no se edita. `db:probar` lo salta al aplicar (ya aplica `schemas/`) y falla si quedó
desactualizado, así que el pre-commit lo vigila.
**Alternativas:** `supabase db diff` para generarla (no se probó: pasa por una herramienta de diff
en vez de copiar el SQL tal cual, y las migraciones a mano tendrían que apartarse para correrlo);
mover las tablas a una migración escrita a mano y abandonar `schemas/` (se pierde el estado
declarativo por dominio, que es lo que lee `docs/MAPA.md`).
**Consecuencia:** mientras no exista base en producción, un cambio de schema es editar `schemas/`
y correr `db:base` + `db:reset` + `db:types` + `db:probar`. Después del primer `db push` la base
queda congelada (ya está aplicada) y los cambios pasan a ser migraciones incrementales: ese día
hay que cambiar esta regla y el chequeo de `db:probar`.

## 2026-10-11 — shadcn dentro de `src/shared/ui`, con sus variables puenteadas a los tokens

**Contexto:** `shadcn init` dejó los componentes en `src/components/ui` y su propio tema neutro en
`globals.css`, fuera de las capas que vigila boundaries y sin relación con `design/tokens.css`.
Los nombres chocaban: `--sidebar` (un ancho en los tokens, un color en shadcn) y `--radius-sm|md`.
**Decisión:** los componentes viven en `src/shared/ui` (alias de `components.json` apuntando ahí).
`globals.css` importa `design/tokens.css` sin capa y define las variables semánticas de shadcn
(`--primary`, `--border`, `--muted-foreground`…) como referencias a tokens. Se eliminaron las
variables de sidebar y de gráficas de shadcn. Los tokens no se registran en `@theme`: en
componentes propios se usan con la sintaxis de variable (`bg-(--color-surface)`), como pide la
cabecera de `tokens.css`.
**Alternativas:** copiar los tokens dentro de `@theme` (dos fuentes que se desincronizan);
reescribir los componentes de shadcn con los nombres de los tokens (se pierde `shadcn add`).
**Consecuencia:** `shadcn add` sigue funcionando y lo nuevo nace con el diseño del proyecto, en
claro y en oscuro, sin tocar cada componente. Un token nuevo que shadcn deba usar necesita su
línea en el puente.

## 2026-10-11 — `puede()` y el catálogo de claves viven en `src/shared/lib/permisos.ts`

**Contexto:** la ficha de `equipo` los ubicaba en su `entities/permisos.ts`, pero `entities/` de
cualquier otro módulo sólo puede importar `@/shared`, y todos necesitan `puede()`.
**Decisión:** el tipo `ClavePermiso`, `puede()`, `alcanceDe()` y `origenesCon()` están en `shared`,
con la misma semántica que `tiene_permiso()`, `alcance_de()` y `origenes_con_permiso()`. Un test
lee `supabase/seed.sql` y falla si el catálogo y el archivo divergen.
**Consecuencia:** `equipo` aporta los datos (`mis_permisos()`), no la regla. Un permiso nuevo se
agrega en el seed (o su migración) y en `permisos.ts` en el mismo commit, o el test lo frena.
