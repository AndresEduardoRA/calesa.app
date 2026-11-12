# tablero

Bandeja de inicio por rol y tablero de métricas con widgets personalizables por usuario; compone a los demás módulos por su API pública.

## Entra y sale

- Entra: permisos del usuario, `preferencias_usuario.widgets`.
- Sale: `<Bandeja nombre permisos sinRol zona>` para `/` por `pantallas/inicio.ts` (sólo `src/app`; el `index.ts` no exporta componentes, hoy nada) y el tablero de `/tablero` (fase 9). No lo consume ningún módulo.
- Depende de: `leads` (recordatorios de hoy, leads sin seguimiento), `agenda` (mis tareas: `leerMisTareas`, 7.07-3) y `equipo` (personas sin rol), por su `index.ts`. Cuando los demás bloques tengan contenido: `logistica`, `web` (y por su API, `cotizaciones`, `repuestos`). «Ver todas» (`components/ver-todas-del-bloque.tsx`) lo dibuja cada bloque que lo necesita, bajo su lista.

## Archivos clave

- `entities/bandeja.ts` — `BLOQUES_BANDEJA` (cada bloque con los permisos que lo muestran), `bloquesVisibles(permisos)`, `ClaveDeBloque` y `TOPE_DE_BLOQUE` (5: cada bloque pide 6 y dice «5» o «más de 5», nunca un total).
- `features/bandeja/bloques/<clave>.tsx` — **un archivo por bloque**, un Server Component que dibuja sólo su cuerpo (recibe `{ bloque, zona }`: `bloques/tipos.ts`); `bloques/registro.ts` los une con un `Record<ClaveDeBloque, …>` (el compilador pide las diez claves). **Quien llena un hueco edita sólo su archivo**: `vehiculos-trabados`, `documentos-por-aprobar` y `alertas-demora` (Fase 6), `tareas` (7), `turnos-web`, `repuestos-por-mover` y `esperas-repuestos` (8). Llenos hoy: `recordatorios`, `leads-sin-seguimiento` y `equipo-sin-rol`. Un bloque lee por la entrada pública del módulo dueño, devuelve `<ErrorDeBloque/>` si falla y `<VacioDeBloque/>` si no hay nada.
- `features/bandeja/components/bandeja.tsx` — `<Bandeja nombre permisos sinRol zona>`: el Inicio. Dibuja el marco de cada bloque (`marco-de-bloque.tsx`: `<section>` y `<h2>`; el título no se toca desde el bloque) y su cuerpo tras un `<Suspense>` con `await connection()` (`montaje-de-bloque.tsx`): uno lento o caído no frena a los demás. `lista-de-bloque.tsx`, `esqueleto-de-bloque.tsx` y `error-de-bloque.tsx` («Reintentar» = `router.refresh()`). Sin rol muestra «Aún no tienes un rol, avisa al dueño».
- Pendiente: `entities/widgets.ts` — catálogo tipado de widgets: clave, permiso que exige, consulta que usa, tamaño.
- `infra/queries/metricas.ts` — RPC agregadas, nunca N consultas desde el cliente: `tablero_leads` y `tablero_cotizaciones` (9.07; una por grupo de
  widgets, piden `tablero.metricas.ver`, ventana ≤ 366 días). «Convertidos» sale de `leads.cliente_desde` (sin grant: sólo la leen esas RPC).
- Pendiente: `features/metricas/` (dataviz con los tokens de `design/tokens.css`).

## Tablas

Ninguna propia. Lee `preferencias_usuario` (equipo) y las vistas/RPC de los otros módulos.

## No se rompe

- La bandeja se arma por permisos, nunca por nombre de rol; un bloque nuevo declara sus permisos en `BLOQUES_BANDEJA`.
- Cada contador de la bandeja lleva a la lista ya filtrada (misma URL con `nuqs`).
- Un widget se muestra sólo si el usuario tiene su permiso; sin datos muestra el estado vacío con la acción que lo llena.
- Métricas de dinero pasan por `<Monto>` (Modo Live).

## Ojo

- Las gráficas usan la escala de `--viz-*`; nunca colores sueltos. Leer la skill `dataviz` antes de agregar una.
