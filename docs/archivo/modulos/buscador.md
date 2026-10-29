# buscador

Paleta global (Ctrl/Cmd+K) que busca leads, vehículos, cotizaciones y acciones acotada a los permisos del usuario, con últimos abiertos.

## Entra y sale

- Entra: texto (mínimo 3 caracteres), atajos de teclado.
- Sale: `<Buscador>` montado en `app/`. No lo consume ningún módulo.
- Depende de: `leads`, `vehiculos`, `cotizaciones` (sus funciones públicas `buscar*` y sus tarjetas).

## Archivos clave

- `entities/ranking.ts` — orden y agrupación por tipo, puro.
- `infra/queries/buscar.ts` — una llamada por sección en paralelo, con cancelación; el ámbito lo aplica RLS en servidor.
- `features/paleta/`.

## Tablas

Ninguna propia. Lee `visitados` (equipo) para «últimos abiertos».

## No se rompe

- Nunca devuelve algo que la RLS esconde ni busca por teléfono (sería una fuga del enmascarado).
- Las acciones («nuevo lead», «cotizar») aparecen sólo si `puede()` lo permite.

## Ojo

- Debounce de 250 ms y mínimo 3 caracteres: el buscador fue una fuente de peticiones innecesarias en `ip`.
