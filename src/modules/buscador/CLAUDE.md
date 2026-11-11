# buscador

Paleta global (Ctrl/Cmd+K) que busca leads, vehículos, cotizaciones y acciones acotada a los permisos del usuario, con últimos abiertos.

## Entra y sale

- Entra: texto (el mínimo de `MINIMO_DE_BUSQUEDA`: 3 letras o dígitos seguidos, o un número de lead o cotización), atajos de teclado.
- Sale: `<Buscador>` montado en `app/` (7.13). 7.10 reusa las lecturas por sección para las menciones `#`.
- Depende de: `leads`, `vehiculos`, `cotizaciones` sólo por la base (las RPC de abajo y `leads_vista_por_ids` para hidratar); no importa sus módulos.

## Archivos clave

- La base (7.12-1): `supabase/migrations/20261111173200_buscador_secciones.sql` y `20261111173300_buscador_visitas.sql`; pruebas en
  `supabase/tests/areas/buscador/` (`buscador.sql`, `visitados.sql`).
- Pendiente (7.12-2): `entities/ranking.ts` (orden y agrupación por tipo, puro, con test); `infra/buscar.client.ts` (una llamada por sección desde
  el navegador, cancelable con `AbortSignal`) e `infra/visitados.client.ts` (los últimos abiertos, hidratados bajo la RLS de cada entidad); `client.ts`;
  el registro en `scripts/guardas/areas-b/paginas-en-la-base.ts` (defecto 5, máximo 20).
- `features/paleta/` (7.13).

## Tablas

Ninguna propia. Escribe `visitados` (equipo) sólo por `visita_registrar(p_tipo, p_id)` (upsert de la fila propia, tope 50 por persona, `lead`,
`vehiculo` o `cotizacion`) y la lee por `visitados_usuario_visto_idx (usuario_id, visto_en desc)` para «últimos abiertos».

RPC (todas de `authenticated`, ninguna de `anon`; tamaño por `_acotar_pagina(p_tamano, 5, 20)` y devuelven hasta n + 1):

- `buscador_leads(p_texto, p_tamano)` → `uuid[]`, invocadora: `#n` por `leads_ids_del_numero` y nombre por `leads_candidatos` (sólo `texto`),
  pasados por `leads_vista_por_ids`.
- `buscador_vehiculos(p_texto, p_tamano)`, invocadora: título, VIN o lote, una ruta por origen visible por `vehiculos_origen_listado_idx`.
- `buscador_cotizaciones(p_texto, p_tamano)`, **`security definer`**: número exacto o título por `cotizaciones_titulo_trgm` (hasta 1.000 de sus orígenes) más las
  propias por `cotizaciones_creador_idx`; repite la policy «cotizaciones: leer» fila por fila; sin montos, papelera, `lead_id`, `vehiculo_id` ni `creado_por`.
- `_buscador_interpretar(p_texto)`: el mínimo en la base, espejo de `interpretarBusqueda()`.

## No se rompe

- Nunca devuelve algo que la RLS esconde ni busca por teléfono o por un campo de un lead (sería una fuga del enmascarado o un oráculo de un privado).
- `buscador_cotizaciones` copia la policy «cotizaciones: leer»: quien la cambie cambia la RPC; `buscador.sql` (B4) compara las dos para tres personas.
- Con menos que el mínimo, nada: lo decide la base, no el navegador.
- Las acciones («nuevo lead», «cotizar») aparecen sólo si `puede()` lo permite.

## Ojo

- Debounce de 250 ms y mínimo 3 caracteres: el buscador fue una fuente de peticiones innecesarias en `ip`.
- Con `SOLO=` la primera cuenta creada es la dueña: `buscador.sql` crea una de relleno antes de sus personas.
