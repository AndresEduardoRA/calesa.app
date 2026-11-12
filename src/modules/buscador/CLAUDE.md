# buscador

Paleta global (Ctrl/Cmd+K) que busca leads, vehículos, cotizaciones y acciones acotada a los permisos del usuario, con últimos abiertos.

## Entra y sale

- Entra: texto (el mínimo de `MINIMO_DE_BUSQUEDA`: 3 letras o dígitos seguidos, o un número de lead o cotización), atajos de teclado.
- Sale: `client.ts` (las lecturas por sección, `leerUltimosAbiertos()`, `agruparResultados()`, `seccionesQueBuscan()` y los tipos); `<Buscador>` montado en `app/` (7.13).
  7.10 (`chat`) importa `@/modules/buscador/client` para las menciones `#` y suma `chat --> buscador` (sin ciclo: buscador no importa chat).
- Depende de: `leads`, `vehiculos`, `cotizaciones` sólo por la base (las RPC de abajo y `leads_vista_por_ids` para hidratar); no importa sus módulos.
  `interpretarBusqueda()` de `@/modules/leads/client` la llama la feature (7.13), no `entities` ni `infra`.

## Archivos clave

- La base (7.12-1): `supabase/migrations/20261111173200_buscador_secciones.sql` y `20261111173300_buscador_visitas.sql`; pruebas en
  `supabase/tests/areas/buscador/` (`buscador.sql`, `visitados.sql`).
- `entities/ranking.ts` (7.12-2, puro, con test): `seccionesQueBuscan(interpretacion)` (espejo de `_buscador_interpretar` y D10), `agruparResultados()`
  (orden de las secciones, número exacto, después lo que empieza con el texto, el resto como lo dio la base; cada una cortada en `POR_SECCION` = 5),
  `ordenarComoLosIds()` y `ultimosAbiertos()` (16 leídas, 8 mostradas, mezcladas por recencia). Recibe la interpretación ya hecha: la llama la feature con
  `interpretarBusqueda()` de `@/modules/leads/client` (`entities` no importa otro módulo). `entities/resultados.ts`: los Zod de lo que llega y las columnas
  que se piden (nunca teléfono, campos ni montos).
- `infra/buscar.client.ts` (7.12-2): `buscarLeads` (dos pedidos: `buscador_leads` y `leads_vista_por_ids`, ordenado como los ids), `buscarVehiculos`,
  `buscarCotizaciones` y `BUSCAR_POR_SECCION`; cada una con `.abortSignal(signal)`, nunca lanza, y con la señal cancelada no pide nada. Registradas en
  `scripts/guardas/areas-b/paginas-en-la-base.ts` (defecto `POR_SECCION` = 5, máximo 20).
- `infra/visitados.client.ts` (7.12-2): `leerUltimosAbiertos({ signal })`, 16 visitas propias por `visitados_usuario_visto_idx` y cada entidad hidratada
  bajo su RLS (leads por `leads_vista_por_ids`, vehículos y cotizaciones por PK con columnas con grant), en paralelo; lo que no llega sale sin marcador.
- `supabase/tests/medir-buscador.sql` (7.12-2): `buscador_cotizaciones` con 50.000 y 250.000 (número, título común y raro, la dueña y Ana), con su guarda sin el GIN;
  `MEDIR_SOLO=medir-buscador pnpm db:medir:volumen` tras `pnpm db:sembrar-volumen` (después, `pnpm db:reset`).
- `features/paleta/` (7.13-1): `actions/registrar-visita.ts` (Server Action sobre `visita_registrar`; esquema en `schemas/visita.ts`, repositorio `RepositorioDeVisitas` →
  `infra/visitas.ts` → `composicion.ts`) y `components/registrar-visita.tsx`, `<RegistrarVisita tipo id />`, sin DOM, una vez por (tipo, id) y sin avisar si falla;
  sale por `pantallas/visita.ts` y lo montan las tres fichas (`/leads/[id]`, `/vehiculos/[id]`, `/cotizaciones/[id]`) **después** de sus salidas «no disponible».
  La paleta (`<Buscador>`, 7.13-2 y 7.13-3) falta.

## Tablas

Ninguna propia. Escribe `visitados` (equipo) sólo por `visita_registrar(p_tipo, p_id)` (upsert de la fila propia, tope 50 por persona, `lead`,
`vehiculo` o `cotizacion`) y la lee por `visitados_usuario_visto_idx (usuario_id, visto_en desc)` para «últimos abiertos».

RPC (todas de `authenticated`, ninguna de `anon`; tamaño por `_acotar_pagina(p_tamano, 5, 20)` y devuelven hasta n + 1):

- `buscador_leads(p_texto, p_tamano)` → `uuid[]`, invocadora: `#n` por `leads_ids_del_numero` y nombre por `leads_candidatos` (sólo `texto`),
  pasados por `leads_vista_por_ids`.
- `buscador_vehiculos(p_texto, p_tamano)`, invocadora: título, VIN o lote, una ruta por origen visible por `vehiculos_origen_listado_idx`.
- `buscador_cotizaciones(p_texto, p_tamano)`, **`security definer`**: número exacto o título por `cotizaciones_titulo_trgm` (hasta 1.000 de sus orígenes) más las
  propias por `cotizaciones_creador_idx` sólo en los orígenes con «propios» sin «todos» (`20261111200531_buscador_cotizaciones_rutas.sql`, 7.12-2); repite la policy «cotizaciones: leer» fila por fila; sin montos, papelera, `lead_id`, `vehiculo_id` ni `creado_por`.
- `_buscador_interpretar(p_texto)`: el mínimo en la base, espejo de `interpretarBusqueda()`.

## No se rompe

- Nunca devuelve algo que la RLS esconde ni busca por teléfono o por un campo de un lead (sería una fuga del enmascarado o un oráculo de un privado).
- `buscador_cotizaciones` copia la policy «cotizaciones: leer»: quien la cambie cambia la RPC; `buscador.sql` (B4) compara las dos para tres personas.
- Con menos que el mínimo, nada: lo decide la base, no el navegador.
- Las acciones («nuevo lead», «cotizar») aparecen sólo si `puede()` lo permite.

## Ojo

- Quien cancela una búsqueda descarta su respuesta mirando su `signal`: la lectura no lanza ni tiene un valor «cancelada» (D14).
- Registrar la visita es una escritura: va por Server Action (`<RegistrarVisita>`, hecho en 7.13-1), no desde `infra/*.client.ts` (D16).

- Debounce de 250 ms y mínimo 3 caracteres: el buscador fue una fuente de peticiones innecesarias en `ip`.
- Con `SOLO=` la primera cuenta creada es la dueña: `buscador.sql` crea una de relleno antes de sus personas.
