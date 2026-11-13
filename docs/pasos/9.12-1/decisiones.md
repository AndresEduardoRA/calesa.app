# 9.12-1 · Auditoría AA, parte 1 de 5: el barrido, el contraste de los tokens y la guarda de esqueletos (2026-11-13)

- **D1 · Barrido por CDP y reglas propias, sin `@axe-core/playwright`** (la recomendada del PLAN): `Accessibility.getFullAXTree` da el nombre que
  calcula Chrome; `ariaSnapshot` lee el DOM. Sin dependencia nueva.
- **D2 · Las rutas salen de `src/app/**/page.tsx`, no de `docs/MAPA.md`:** el mapa no se versiona y en CI no existe; se lee del mismo árbol del que lo
  genera `mapa.sh`. Una página dinámica nueva sin resolver hace caer la prueba de cobertura (A0).
- **D3 · El tema oscuro sólo repite el foco visible:** el nombre, las referencias, el `h1`, el título y el orden no cambian con el tema, y el contraste lo
  mide `design/tokens.test.ts`.
- **D4 · `--shadow-focus` pasa a `0 0 0 2px var(--color-primario-ink)`:** el `-ink` ya está garantizado ≥ 4,5:1 sobre la superficie en los dos temas y
  con cualquier marca (`tokensDeMarca`); el `-soft` con 12 % o 22 % de alfa daba 1,2:1. 2 px por la misma razón de tamaño visual. Es `box-shadow`: no
  mueve el layout. Se revierte en una línea.
- **D5 · Los bordes de las celdas del cotizador (`celda-*-borde`) no entran en el 3:1:** la celda se reconoce por la grilla y su relleno. El borde de la
  celda neutra sí cambia, porque es `line-strong`.
- **D6 · El anillo `ring-ring/50` de `src/shared/ui` (7 usos) y `--ring` (= `primario`, 2,5:1 sobre la superficie oscura) quedan para la 9.12-3:** son
  componentes y `src/app/globals.css` (Nivel 2), no tokens. `--shadow-focus`, que usan 9 clases de `shared/ui`, ya llega.
- **D7 · Un conocido que una corrida no ve no la hace caer:** lo dibujado cambia con el proyecto y el estado; queda como anotación `conocido-sin-ver`. Las
  partes 2, 3 y 5 borran sus entradas al arreglarlas.
- **D8 · Los tokens se corrigen hacia la tinta en los dos temas** (no hacia el `paper` en oscuro, como decía el plan: acercar al fondo baja el
  contraste), con el primer valor que pasa todos sus pares. `line-strong` es también el borde de varias tarjetas (`cotizaciones`, `diseno`): se ven más
  marcadas. Es lo que pide 1.4.11 para el borde de un control y se revierte en dos líneas.
- **D9 · `/cotizaciones/[id]` queda pendiente para la 9.12-2** (el origen sembrado no tiene fórmula publicada) y **`/repuestos/[id]/cotizaciones/[cotizacion]`
  y `/configuracion/web/guias/[id]` para la 9.12-5**: no se visitan ni se saltan (un `test.skip` cuenta como error en el completo).

## Auditoría AA (9.12)

**Tokens corregidos** (el mínimo de sus pares, antes → después):

| Token                               | Tema   | Antes                      | Después            | Mínimo antes → después          |
| ----------------------------------- | ------ | -------------------------- | ------------------ | ------------------------------- |
| `--color-ink-faint`                 | claro  | `#76809a`                  | `#646d85`          | 3,46 → 4,52 (sobre `paper-dim`) |
| `--color-ink-faint`                 | oscuro | `#8d97ab`                  | `#929caf`          | 4,24 → 4,51 (sobre `surface-3`) |
| `--color-line-strong` (= `--input`) | claro  | `#cfd4de`                  | `#8a8f9b`          | 1,39 → 3,02                     |
| `--color-line-strong` (= `--input`) | oscuro | `#3b4457`                  | `#6c7482`          | 1,45 → 3,01                     |
| `--shadow-focus`                    | claro  | 3px `primario-soft` (12 %) | 2px `primario-ink` | 1,18 → 6,76                     |
| `--shadow-focus`                    | oscuro | 3px `primario-soft` (22 %) | 2px `primario-ink` | 1,20 → 7,05                     |

**Barrido** (45 páginas de `src/app`; 42 visitadas en `escritorio` y `movil`, 3 pendientes por D9):

| Regla                                          | Escritorio          | Móvil             | Resultado                    |
| ---------------------------------------------- | ------------------- | ----------------- | ---------------------------- |
| R1 · control sin nombre                        | 0                   | 0                 | dura: en cero, sin conocidos |
| R2 · `aria-describedby`/`aria-labelledby` roto | 0                   | 0                 | dura: en cero, sin conocidos |
| R3 · un `h1` visible                           | 9 rutas sin         | 9 rutas sin       | informe                      |
| R4 · título                                    | 4 títulos repetidos | ídem              | informe                      |
| R5 · orden de foco                             | 0                   | 0                 | informe                      |
| R6 · foco visible (10 Tab)                     | 0                   | 6, sólo en oscuro | informe                      |
| R7 · blancos < 44 px                           | — (puntero fino)    | 264 en 42 rutas   | informe                      |

| Regla | Dónde                                                                                                                                                        | Proyecto      | Cuántos | Ejemplo                                 | La arregla                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------- | --------------------------------------- | --------------------------------------------------------------------------- |
| R3    | `/cotizaciones`, `/vehiculos`                                                                                                                                | los dos       | 2       | sin `h1` visible                        | 9.12-2                                                                      |
| R3    | `/logistica`, `/logistica/aduana`, `/logistica/embarques`, `/logistica/gastos`, `/logistica/vehiculo/[id]`, `/repuestos`, `/actividad`                       | los dos       | 7       | sin `h1` visible                        | 9.12-5                                                                      |
| R4    | `/auth/nueva-contrasena` y `/recuperar`                                                                                                                      | los dos       | 1       | «Recuperar la contraseña»               | se acepta: sin sesión de enlace, la primera redirige a la segunda           |
| R4    | `/leads` y `/configuracion/leads`; `/logistica`, `/logistica/vehiculo/[id]` y `/configuracion/logistica`; `/repuestos` y `/configuracion/repuestos`          | los dos       | 3       | «Leads · Mi importadora»                | 9.12-3 (el título de Configuración) y 9.12-5 (el del vehículo en logística) |
| R6    | `/datos`, los seis campos de fecha                                                                                                                           | movil, oscuro | 6       | `input[data-slot=input][type=date]`     | 9.12-5                                                                      |
| R7    | el botón del marco en todas las rutas, también acceso                                                                                                        | movil         | 43      | `button[data-slot=button][type=button]` | 9.12-3                                                                      |
| R7    | el salto al contenido (`#contenido`, `_shell/marco.tsx`)                                                                                                     | movil         | 38      | `a href=#contenido`                     | 9.12-3 (sólo se ve al enfocarlo)                                            |
| R7    | los interruptores (`switch`) de Configuración › Leads, Roles, Orígenes, Agenda y Perfil                                                                      | movil         | 67      | `span[data-slot=switch]`                | 9.12-3                                                                      |
| R7    | las pestañas (`tabs-trigger`) de 13 rutas                                                                                                                    | movil         | 54      | `button[data-slot=tabs-trigger]`        | 9.12-3                                                                      |
| R7    | botones sin `data-slot` (`/actividad` 20, `/configuracion/repuestos` 6, `/leads` 3, `/configuracion/flujos` 2, `/repuestos` y `/configuracion/cotizacion` 1) | movil         | 33      | `button[type=button]`                   | 9.12-2 (leads), 9.12-3 (Configuración), 9.12-5 (actividad, repuestos)       |
| R7    | los disparadores de popover de Roles                                                                                                                         | movil         | 11      | `button[data-slot=popover-trigger]`     | 9.12-3                                                                      |
| R7    | enviar en `/configuracion/origenes/[id]`, `/actividad` y `/datos`                                                                                            | movil         | 5       | `button[data-slot=button][type=submit]` | 9.12-3 y 9.12-5                                                             |
| R7    | enlaces sueltos (volver a `/configuracion/*`, `/vehiculos/«id»`, `/leads`, `/tablero`, `tel:`, `/perfil#notificaciones`)                                     | movil         | 12      | `a href=/configuracion/origenes`        | la parte de su ruta                                                         |
| R7    | casillas de `/vehiculos` y `/logistica`                                                                                                                      | movil         | 2       | `span[data-slot=checkbox]`              | 9.12-2 y 9.12-5                                                             |
