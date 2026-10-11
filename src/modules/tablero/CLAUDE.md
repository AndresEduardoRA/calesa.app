# tablero

Bandeja de inicio por rol y tablero de métricas con widgets personalizables por usuario; compone a los demás módulos por su API pública.

## Entra y sale

- Entra: permisos del usuario, `preferencias_usuario.widgets`.
- Sale: `/` (bandeja) y `/tablero`. No lo consume ningún módulo.
- Depende de: `logistica`, `leads`, `web` (y por su API, `cotizaciones`, `agenda`, `repuestos`).

## Archivos clave

- `entities/widgets.ts` — catálogo tipado de widgets: clave, permiso que exige, consulta que usa, tamaño.
- `infra/queries/metricas.ts` — RPC agregadas (una por tablero), nunca N consultas desde el cliente.
- `features/bandeja/`, `features/metricas/` (dataviz con los tokens de `design/tokens.css`).

## Tablas

Ninguna propia. Lee `preferencias_usuario` (equipo) y las vistas/RPC de los otros módulos.

## No se rompe

- Cada contador de la bandeja lleva a la lista ya filtrada (misma URL con `nuqs`).
- Un widget se muestra sólo si el usuario tiene su permiso; sin datos muestra el estado vacío con la acción que lo llena.
- Métricas de dinero pasan por `<Monto>` (Modo Live).

## Ojo

- Las gráficas usan la escala de `--viz-*`; nunca colores sueltos. Leer la skill `dataviz` antes de agregar una.
