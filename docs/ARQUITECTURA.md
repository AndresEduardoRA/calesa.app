# Arquitectura

**Nivel:** 2 — monolito modular. La razón está en `docs/DECISIONES.md`.
El índice vivo de módulos, rutas y tablas es `docs/MAPA.md` (generado). Este archivo explica cómo
encajan; el mapa dice qué hay.

## Piezas y dependencias

```mermaid
flowchart LR
  equipo --> empresa
  origenes --> equipo
  flujos --> origenes
  vehiculos --> origenes
  vehiculos --> flujos
  vehiculos --> equipo
  leads --> equipo
  cotizaciones --> leads
  cotizaciones --> vehiculos
  cotizaciones --> empresa
  logistica --> vehiculos
  logistica --> flujos
  logistica --> cotizaciones
  repuestos --> vehiculos
  repuestos --> flujos
  repuestos --> leads
  agenda --> leads
  agenda --> vehiculos
  chat --> agenda
  chat --> vehiculos
  chat --> leads
  chat --> cotizaciones
  notificaciones --> equipo
  actividad --> equipo
  web --> vehiculos
  web --> leads
  web --> equipo
  buscador --> leads
  buscador --> vehiculos
  buscador --> cotizaciones
  tablero --> logistica
  tablero --> leads
  tablero --> web
  datos --> leads
  datos --> vehiculos
```

Las flechas van en un solo sentido. Un ciclo entre módulos es un error de diseño: se resuelve con
un evento o con una función que el módulo de abajo expone, no importándose mutuamente. `equipo` y
`empresa` están abajo de todo (permisos y ajustes); `buscador`, `tablero` y `datos` arriba de todo
(componen a los demás por su API pública).

## Capas

| Desde (dentro de un módulo) | Puede importar                                                               |
| --------------------------- | ---------------------------------------------------------------------------- |
| `features/`                 | `entities/` del mismo módulo, `@/shared`, las entradas de `@/modules/<otro>` |
| `entities/`                 | `@/shared`                                                                   |
| `infra/`                    | `entities/` del mismo módulo, `@/shared`                                     |
| `src/app/`                  | las entradas y las pantallas de `@/modules/<x>`, `@/shared`                  |
| `src/shared/`               | `src/shared/`                                                                |

`features` no importa `infra`: los casos de uso dependen de la interfaz de repositorio que declara
`entities`, y la composición del módulo (`composicion.ts` en el servidor, `composicion.client.ts`
en el navegador) decide qué implementación concreta reciben. Lo verifica
`eslint-plugin-boundaries`; la regla entre módulos la verifica además `scripts/mapa.sh --check`.

Un módulo tiene **dos entradas** y nada más se importa desde afuera:

- `@/modules/<x>` (`index.ts`) — para Server Components. Puede traer código de servidor
  (`server-only`, actions, lecturas), así que un Client Component que la importe rompe el build.
- `@/modules/<x>/client` (`client.ts`) — para Client Components de `app/` o de otro módulo: hooks,
  componentes de cliente y tipos de `entities/`. Nunca nada de servidor.

`src/app` suma dos más, que ningún otro código importa:

- `@/modules/<x>/pantallas/<pantalla>` (`pantallas/<pantalla>.ts`) — los componentes de una pantalla,
  reexportados sólo los que esa pantalla dibuja. El `index.ts` **no exporta componentes**: una pantalla paga
  en JS todo lo que reexporta lo que importa, y con un barril de todas `/perfil` pagaba 30 KB que no usa.
  `scripts/guardas/barriles.test.ts` falla si el `index.ts` de un módulo alcanza un módulo `'use client'`.
- `@/modules/<x>/shell` (y `shell.client`) — sólo el layout `(app)`: lo que dibuja el marco de toda pantalla.

`composicion*.ts` es privado del módulo aunque esté en su raíz.

## Dónde va cada cosa

- `src/proxy.ts` — refresco de sesión; Next 16 lo exige al nivel de `app/`, no adentro.
- `src/app/` — rutas (App Router), `layout.tsx`, `manifest.ts`, route
  handlers (`api/portal`, `api/revalidar`, `api/push`, `api/pdf`). Composition root.
- `src/modules/<dominio>/index.ts` — API pública del módulo (servidor); `client.ts` — la de cliente.
  `pantallas/<pantalla>.ts` — los componentes de cada pantalla, para `src/app`.
- `src/modules/<dominio>/features/<caso>/` — `components/`, `hooks/`, `actions/`, `schemas/`.
- `src/modules/<dominio>/entities/` — tipos, reglas puras, `puede()`, transiciones, interfaces.
- `src/modules/<dominio>/infra/` — repositorios Supabase (`queries/`, `*.client.ts`), adaptadores.
- `src/shared/ui/` — shadcn + componentes transversales: `XCell`, `FilterShell`, `Drawer`,
  `Modal`, `Bloque`, `Monto`, `Badge`, `Confirmar`, `estados/`, `esqueletos/`.
- `src/shared/lib/` — `supabase/` (server, browser, admin, proxy), `safe-action.ts`,
  `permisos.ts` (`puede()`), `formato.ts`, `fechas.ts`, `errores.ts`, `imagenes/`.
- `src/shared/types/database.types.ts` — generado.
- `supabase/migrations/` (la base, que no se edita, y una migración por cambio) · `supabase/functions/<nombre>/` ·
  `supabase/tests/humo.sql`.
- `e2e/` — Playwright de los flujos críticos (tareas de oro de `docs/UX.md`).

## Cómo viaja una operación

«Mover un vehículo a la fase Embarcado» (tarea de oro 3):

1. `app/(app)/logistica/page.tsx` (Server Component) lee la cadena con
   `logistica.cadenaPorFlujo(origenId)` (query de `infra/`, bajo RLS del usuario) y pasa los datos
   al componente `features/cadena/components/Cadena`.
2. El usuario abre el panel del vehículo: el hook `usePrevisualizarCambio` llama a la action
   `previsualizarCambioFase` → RPC `previsualizar_cambio_fase` → devuelve `ok`, motivos y requisitos
   evaluados; la UI muestra «qué falta» antes del clic.
3. Clic en «Mover a Embarcado» → `cambiarFase` (action con `next-safe-action`): valida con Zod,
   comprueba `puede(permisos, 'flujos.mover', origenId)` en `entities/`, llama a la RPC
   `cambiar_fase(vehiculo, null, fase, nota, fase_esperada)`.
4. La RPC (única puerta que escribe `fase_id`) repite la secuencia: viva → destino existe y activo
   → transición o inicial → rol → requisitos bloqueantes → escribe `vehiculos.fase_id`,
   `historial_fases`, `notas` y `actividad` en una transacción. Conflicto → `PT409`.
5. La action traduce el resultado a `{ ok }` o `{ ok: false, error: { codigo: 'conflicto' } }`,
   `revalidatePath('/logistica')`; la UI muestra el toast o el aviso «Rosa lo movió hace 1 min ·
   Recargar». Si se marcó un lote, `cambiar_fase_lote` devuelve ok/motivo por unidad y la UI
   muestra el resultado parcial.

## Mecanismos transversales

- **Permisos**: catálogo fijo en `supabase/seed.sql` (`permisos`) + `src/shared/lib/permisos.ts`
  (mismas claves, tipadas). `puede(permisos, clave, origenId)` en `entities/`; en la base,
  `tiene_permiso()` / `alcance_de()` en policies y RPC. La UI esconde o deshabilita; la base decide.
- **Perspectiva «ver como»**: cookie `perspectiva` → `mi_sesion(p_perspectiva)` →
  `permisos_efectivos()` (los propios ∩ los del rol). Son los que trae `Sesion.permisos` y dibujan
  la interfaz; las policies, las RPC y `actionClient` usan `mis_permisos()` (los reales).
- **Cliente admin**: salta la RLS. Una sola excepción fuera del portal, webhooks y crons:
  `conAdminDeAuth()` en `equipo/infra/invitaciones.ts` (`.claude/rules/datos.md`).
- **Auditoría**: tabla `actividad` escrita por el trigger `auditar()` y por `registrar_actividad()`
  desde las RPC. Purga a 14 días (`ajustes_empresa.actividad_dias`).
- **Estados**: fases como datos (`flujos`, `fases`, `fases_transiciones`) y un único motor
  `cambiar_fase`. Las reglas que la UI necesita (transiciones permitidas, qué falta) salen de
  `previsualizar_cambio_fase`, nunca se reimplementan en componentes.
- **Conflictos**: `actualizado_en` + `p_*_esperado` → `PT409` → `codigo: 'conflicto'`. Donde la
  versión daría conflictos falsos (bloquear, dar de baja), la precondición es el estado.
- **Trabajo en segundo plano**: `supabase/functions/` (`storage-gc`, `push`, `apibara`,
  `importar-csv`) + `pg_cron` (recordatorios, expirar turnos, alertas de demora, purgas).
- **Realtime**: canales de Supabase para chat y notificaciones; la fila es señal, se rehidrata por fetch.
- **Modo Live**: `useLive()` + `<Monto>`; clase en `<html>`; todo monto pasa por ahí.
- **Campos configurables**: el motor es de `shared` (`lib/campos` puro, `ui/campos` el editor) y de la base
  (`_campo_*`, `_campos_*`, `_atributos_*`). `origenes` (el layout de un vehículo) y `leads` ponen lo suyo:
  qué campos hay, claves reservadas, permiso y banderas. Un campo con datos se desactiva, no se borra; lo
  que se guarda se valida contra el layout en la base; lo privado se recorta al leer (`atributos_lead()`).
- **Filtros en URL**: esquema declarativo por listado (`shared/lib/filtros`), `FilterShell` y `nuqs`. La página lee la URL con `leerFiltros()` (tolerante) y el módulo traduce los valores a condiciones para su consulta. Listas grandes: keyset con `shared/lib/paginacion`. Vistas guardadas: de `equipo` (`<MenuDeVistas>`), montadas por el listado.
- **Tema**: tokens en `design/tokens.css` → `src/app/globals.css` (`@theme`), modo oscuro por
  clase `.dark`, preferencia por usuario.

## Cuando crees una unidad nueva

1. Carpeta en `src/modules/<dominio>/` con su `CLAUDE.md` de ficha (plantilla en cualquier módulo
   existente). Sin ficha, `scripts/mapa.sh --check` falla.
2. Su API pública en `index.ts`. Nada más se importa desde afuera.
3. Términos nuevos del negocio → `docs/GLOSARIO.md`.
4. `bash scripts/mapa.sh` (el hook Stop lo corre solo; el pre-commit lo verifica).
