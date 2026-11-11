## 2026-11-11 — 7.12-1: el buscador, la base

- **Compuerta `datos`** por `buscador_cotizaciones` (un `security definer` nuevo): con `PILOTO_AUTO=todo` se aprobó sola. La sostiene B4 de
  `supabase/tests/areas/buscador/buscador.sql` (la RPC ve lo mismo que la tabla para tres personas) y las mutaciones del informe.
- **D1 · Las tres secciones son RPC**, no sólo la de cotizaciones: el assert pide «con 2 letras, nada» y el mínimo en el servidor, y por PostgREST no
  hay dónde ponerlo. Las de leads y vehículos son invocadoras: no copian ninguna visibilidad.
- **D2 · `buscador_leads` devuelve ids**, no filas: una `setof leads_vista` sólo nace en `_leads_vista_crear()`; el 7.12-2 hidrata con
  `leads_vista_por_ids`, que recorta teléfono y privados.
- **D3 · «La cotización que su nivel no ve»** se lee como el alcance de `cotizaciones.ver` (propios o todos, y la cartera): la fila no se recorta por
  los niveles de la fórmula y la RPC no devuelve nada que un nivel recorte.
- **D4 · No entra al inventario de `cotizaciones-visibilidad.sql`:** su detector no la ve (no nombra lo oculto ni devuelve la fila) y registrarla
  rompería esa prueba; la ata B5 de `forma.sql` (columnas exactas y cuerpo sin lo oculto). Si un cambio la hace nombrar lo oculto, el detector la pide.
- **D5 · Sin `lead_id`, `vehiculo_id` ni `creado_por`** en `buscador_cotizaciones`: el buscador muestra número y título; lo demás, al abrir la ficha.
- **D6 · Hasta 1.000 candidatas por título**, de los orígenes que quien llama ve, más sus propias por `cotizaciones_creador_idx`: con más coincidencias
  la sección muestra las propias más nuevas y cinco de la muestra; las de cartera ajena pueden quedar fuera. El camino a lo completo es
  `/cotizaciones` (7.13 decide el enlace).
- **D7 · `visita_registrar` no mira si la entidad se ve:** escribe sólo filas propias y no revela nada; la hidratación (7.12-2) pasa por la RLS de
  cada entidad. Acepta `lead`, `vehiculo` y `cotizacion`.
- **D8 · El tope de 50 sin candado:** dos visitas a la vez pueden dejar 51 un rato; la próxima recorta y `actividad_purgar()` borra lo de más de 30 días.
- **D9 · Sin `medir-buscador.sql` en esta parte** (pruebas sólo en lo clave): el `EXPLAIN` de `buscador_cotizaciones` queda pendiente del 7.12-2, dicho
  en RENDIMIENTO como límite sin assert.
- **D10 · `#n` busca leads y cotizaciones**, no vehículos.
- **D11 · Los docs de esta parte van a `docs/pasos/7.12-1/`**, como `docs/pasos/5.02-1/`.
