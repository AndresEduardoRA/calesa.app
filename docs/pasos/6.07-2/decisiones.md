## 2026-11-12 — Paso 6.07-2: la escritura de aduana

- **D20 · La cabecera tiene versión propia:** `declaracion_version()` reemplaza al trigger genérico, como `documento_version`. Poner vehículos toca la
  cabecera y mueve su versión aunque el cambio sea en la tabla hija.
- **D21 · Esperada nula sobre una declaración que existe → PT409**, como D11 del transporte. Crear es `p_id` nulo; con esperada, 22023. Una que no existe,
  PT409 «La declaración ya no existe».
- **D22 · El número se guarda tal cual, sin espacios alrededor**, 1 a 60. Despachante y depósito ≤ 200, notas ≤ 2.000, fechas sólo `AAAA-MM-DD`. Sin regla
  entre aceptación y vencimiento de tributos (nadie la pidió).
- **D23 · Poner y quitar piden ver cada vehículo** (`logistica.ver`): 42501 sin decir cuál. A lo sumo 200 por vez. Agregar uno ya vivo o quitar uno que
  no está no hace nada.
- **D24 · Un vehículo vivo en otra declaración: 23514 con el número de la otra.** Lo frena el índice único al escribir: si otra sesión lo está quitando,
  se espera y entra.
- **D25 · Agregar pide la regla `aduana` del flujo y una fase con `permite_aduana`.** Quitar no: salir siempre se puede, salvo con canal o si la fase
  exige la declaración.
- **D26 · No se pone canal a una declaración sin vehículos vivos:** congelaría una composición vacía.
- **D27 · El congelamiento vale también en la tabla**, por cualquier camino. La purga en cascada de un vehículo no la frena.
- **D28 · No se quita un vehículo si su fase exige `aduana.declaracion` o `aduana.canal` como bloqueante**, aunque el canal todavía no se cumpla.
- **D29 · Carrera propia de aduana** (quitar contra mover, pasar un vehículo entre declaraciones y el intercambio), en `supabase/tests/areas/aduana/`.
- **D30 · Las policies de leer no cambian aquí:** la lectura con D2 es `declaracion_leer`, en 6.07-3.
- **Un solo recorrido en orden de id al poner** (de la auditoría del plan): quitar todo y después agregar todo formaba un ciclo cuando dos personas
  intercambian vehículos entre dos declaraciones (40P01). Ahora toda espera va hacia un id mayor y el intercambio termina en 23514.
