# tablero

Bandeja de inicio por rol y tablero de métricas con widgets personalizables por usuario; compone a los demás módulos por su API pública.

## Entra y sale

- Entra: permisos del usuario, `preferencias_usuario.widgets`.
- Sale: `<Bandeja>` para `/` (hoy) y el tablero de `/tablero` (fase 9). No lo consume ningún módulo.
- Depende de: hoy de ningún módulo (la bandeja sólo usa permisos de `shared`). Cuando los bloques tengan contenido: `logistica`, `leads`, `web` (y por su API, `cotizaciones`, `agenda`, `repuestos`).

## Archivos clave

- `entities/bandeja.ts` — `BLOQUES_BANDEJA` (cada bloque con los permisos que lo muestran) y `bloquesVisibles(permisos)`. Hoy los bloques están declarados y vacíos: el contenido llega con el módulo que lo cuenta.
- `features/bandeja/components/bandeja.tsx` — `<Bandeja nombre permisos sinRol>`: el Inicio. Sin rol muestra «Aún no tienes un rol, avisa al dueño».
- Pendiente: `entities/widgets.ts` — catálogo tipado de widgets: clave, permiso que exige, consulta que usa, tamaño.
- `infra/queries/metricas.ts` — RPC agregadas (una por tablero), nunca N consultas desde el cliente.
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
