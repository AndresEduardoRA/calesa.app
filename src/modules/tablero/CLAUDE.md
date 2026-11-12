# tablero

Bandeja de inicio por rol y tablero de métricas con widgets personalizables por usuario; compone a los demás módulos por su API pública.

## Entra y sale

- Entra: permisos del usuario, `?periodo=` de la URL y, desde el 9.08-3, la preferencia `tablero.widgets` de `preferencias_usuario`.
- Sale: `<Bandeja nombre permisos sinRol zona>` para `/` por `pantallas/inicio.ts` (sólo `src/app`; el `index.ts` no exporta componentes, hoy nada) y `<PanelDelTablero permisos periodo zona>` para `/tablero` por `pantallas/tablero.ts` (9.08-1). No lo consume ningún módulo.
- Depende de: `leads` (recordatorios de hoy, leads sin seguimiento), `agenda` (mis tareas: `leerMisTareas`, 7.07-3), `equipo` (personas sin rol) y `logistica` (los tres bloques de la Fase 6: `bandejaLogistica`, una lectura por request, y las claves de URL de la cadena para «Ver todas», 6.12-2), por su `index.ts`. Cuando los demás bloques tengan contenido: `web` (y por su API, `cotizaciones`, `repuestos`). «Ver todas» (`components/ver-todas-del-bloque.tsx`) lo dibuja cada bloque que lo necesita, bajo su lista.

## Archivos clave

- `entities/bandeja.ts` — `BLOQUES_BANDEJA` (cada bloque con los permisos que lo muestran), `bloquesVisibles(permisos)`, `ClaveDeBloque` y `TOPE_DE_BLOQUE` (5: cada bloque pide 6 y dice «5» o «más de 5», nunca un total).
- `features/bandeja/bloques/<clave>.tsx` — **un archivo por bloque**, un Server Component que dibuja sólo su cuerpo (recibe `{ bloque, zona }`: `bloques/tipos.ts`); `bloques/registro.ts` los une con un `Record<ClaveDeBloque, …>` (el compilador pide las diez claves). **Quien llena un hueco edita sólo su archivo**: `vehiculos-trabados`, `documentos-por-aprobar` y `alertas-demora` (Fase 6), `tareas` (7), `turnos-web`, `repuestos-por-mover` y `esperas-repuestos` (8). Llenos hoy: `recordatorios`, `leads-sin-seguimiento`, `equipo-sin-rol`, `tareas` y los tres de logística (6.12-2: `vehiculos-trabados` sin «Ver todas», porque la cadena no filtra trabados). Un bloque lee por la entrada pública del módulo dueño, devuelve `<ErrorDeBloque/>` si falla y `<VacioDeBloque/>` si no hay nada.
- `features/bandeja/components/bandeja.tsx` — `<Bandeja nombre permisos sinRol zona>`: el Inicio. Dibuja el marco de cada bloque (`marco-de-bloque.tsx`: `<section>` y `<h2>`; el título no se toca desde el bloque) y su cuerpo tras un `<Suspense>` con `await connection()` (`montaje-de-bloque.tsx`): uno lento o caído no frena a los demás. `lista-de-bloque.tsx`, `esqueleto-de-bloque.tsx` y `error-de-bloque.tsx` («Reintentar» = `router.refresh()`). Sin rol muestra «Aún no tienes un rol, avisa al dueño».
- `entities/widgets.ts` — `WIDGETS_TABLERO` (catálogo: clave, título, permisos, grupo de RPC, tamaño, `disponible`; `margen-del-mes` y `cola-web` son huecos del 9.11), `widgetsVisibles(permisos)` y `aplicarPreferencia(visibles, {orden, ocultos} | null)`. `entities/periodo.ts` (`?periodo=mes|mes-anterior|90d`, calculado con la zona de la empresa), `entities/cifras.ts` (una tasa nula es «Sin datos», nunca «0 %») y `entities/metricas.ts` (los payloads de las RPC con Zod y `RepositorioDeMetricas`).
- `infra/queries/metricas.ts` — las RPC `tablero_leads` y `tablero_cotizaciones` (9.07; una por grupo de widgets, piden `tablero.metricas.ver`, ventana ≤ 366 días), validadas con Zod; `composicion.ts` las une a la interfaz. «Convertidos» sale de `leads.cliente_desde` (sin grant: la leen esas RPC y queda en la foto de `actividad`, D12).
- `features/metricas/` — `lectura.ts` (una llamada por grupo y request, con `cache()`), `widgets/<clave>.tsx` (un archivo por widget, Server Component que dibuja su cuerpo; `widgets/registro.ts` los une con un `Record<ClaveDeWidget, …>`; **quien llena un hueco edita su archivo**) y `components/` (`panel-del-tablero`, `marco-de-widget`, `montaje-de-widget` con `await connection()` tras su `<Suspense>`, `selector-de-periodo` con tres `<Link>`, `error-de-widget` con «Reintentar»). Cada cifra es un `role="group"` con nombre «Título: valor».
- `entities/graficas.ts` (escala redonda, fracción, marcas de días, textos y topes `TOPE_DE_ORIGENES`/`TOPE_DE_PERSONAS`) y `features/metricas/graficas/` (`barras-por-dia`, `ranking`, `tabla-equivalente` con «Ver como tabla» en un `<details>`, `vacio-de-grafica`, `leyenda`): HTML y SVG de servidor con los tokens `--viz-*`; una gráfica es `role="img"`, no `group`. Cinco widgets anchos las usan (`leads-por-dia`, `cotizaciones-por-dia`, `leads-por-origen`, `leads-por-persona`, `cotizaciones-por-origen`).
- Pendiente: «Personalizar» y la preferencia `tablero.widgets` (9.08-3).

## Tablas

Ninguna propia. Lee `preferencias_usuario` (equipo) y las vistas/RPC de los otros módulos.

## No se rompe

- La bandeja se arma por permisos, nunca por nombre de rol; un bloque nuevo declara sus permisos en `BLOQUES_BANDEJA`.
- Cada contador de la bandeja lleva a la lista ya filtrada (misma URL con `nuqs`).
- Un widget se muestra sólo si el usuario tiene su permiso; sin datos muestra el estado vacío con la acción que lo llena.
- Métricas de dinero pasan por `<Monto>` (Modo Live).

## Ojo

- Las gráficas usan la escala de `--viz-*`; nunca colores sueltos. La skill `dataviz` no está en este árbol: regirse por `design/tokens.css` y las decisiones D15 a D21 de `docs/pasos/9.08-2/decisiones.md`.
