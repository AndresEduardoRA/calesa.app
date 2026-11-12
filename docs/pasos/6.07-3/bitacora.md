## 2026-11-12 — Paso 6.07-3: las lecturas de transporte y aduana (parte 3 de 3: cierra el 6.07)

- **Hecho:** las tres lecturas de la base que piden 6.08 y 6.09, y la policy de leer de la cabecera de aduana por origen.
  - `declaraciones_listar(desde, id, tope, filtros)`: por cursor `(creado_en desc, id desc)` sobre `declaraciones_aduana_creado_idx`, en lotes de 200
    sin filtros en la consulta; filtros `canal`, `pagada` y `q` (prefijo del número). Por fila `vehiculos` y `faltan` (de los que se ven), `hay_ocultos`
    y `pagada` (de todos los vivos). Con `logistica.aduana.gestionar`, todas; con `logistica.ver`, las que tienen un vehículo vivo que se ve; sin ninguna, 42501.
  - `declaracion_leer(id)`: la cabecera, los vehículos vivos que se ven (hasta 200, con `tributo`), `hay_mas`, `hay_ocultos`, `pagada`, `faltan`. «No
    existe» y «no la ves» dan el mismo P0002. Su `actualizado_en` sirve de esperada para guardar, poner y el canal.
  - Policy `declaraciones_aduana: leer`: gestionar, o un vehículo vivo de la declaración que se ve con `logistica.ver` (antes bastaba `logistica.ver`
    en cualquier origen, y un select directo leía toda cabecera).
  - `transporte_grupos(tipo, desde, tope, filtros)`: embarques (booking) o contenedores por cursor sobre la clave, con sondas por los índices parciales;
    filtros naviera, puertos, en tránsito y prefijo; por grupo unidades que se ven, `hay_mas`, `hay_ocultas`, datos comunes y `varios`. Mira a lo sumo
    2.000 filas por llamada y dice `cortada` para «Seguir buscando». `siguiente` es opaco: el id de una fila, nunca una clave.
- **Commits:**
  - `f02ff1a7`: listar las declaraciones con `pagada`.
  - `2139af8c`: leer una declaración.
  - `5e64dc87`: la policy de leer por origen.
  - `4ba17186`: los grupos de transporte.
  - `69db7103`: `declaracion_leer` en las guardas de leads.
  - `cd7a7e66`: el cursor de los grupos como un id (de la auditoría del informe).
- **Verificación** (`.piloto/salidas/6.07-3/`):
  - `db:probar` entero en PGlite: 1.209 ✓ y 0 ✗ (L1–L4, R1–R3, T1–T4 y el caso de humo).
  - `db:lint` sin avisos de las funciones nuevas; guardas 1.078 ✓; `typecheck` en verde.
- **Desvíos del plan:**
  - La lista de declaraciones recorre por lotes y filtra en plpgsql: con los filtros `$x is null or …` en la consulta, el plan genérico ordenaba toda la
    tabla aun con `cost 1000` (`l4-plan-viejo.txt`).
  - El commit `69db7103` no estaba en el plan: `declaracion_leer` nombra `vehiculos.lead_id` (alcance propios) y la auditoría de leads y el inventario del
    número global la piden registrada. El commit `2139af8c` quedó con esas dos guardas en rojo hasta él.
- **Para 6.08 y 6.09:** registrar `transporte_grupos` (`areas-b`) y `declaraciones_listar` (`areas-c`) en `paginas-en-la-base.ts` al llamarlas (D38), y
  nombrar las RPC nuevas en la ficha `src/modules/logistica/CLAUDE.md`.
- **Pendiente:** `scripts/carreras.mjs` pasa de 300 líneas (de antes de este paso): partirlo.
- e2e completo: no (6.07-3, Nivel 2: lo corre el CI del PR; sin interfaz, sin dirigidos)
