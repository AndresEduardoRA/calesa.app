## 2026-11-11 — Paso 6.02-3

- **Parte 3 de 3** (la unidad y «dónde está»; cierra el 6.02). Plan: `.piloto/planes/6.02-3.md`; las respuestas a la auditoría (observaciones),
  `.piloto/planes/6.02-3.respuestas.md`.
- **D1 · `notas_vehiculo_id_idx` se queda:** el nuevo `notas_vehiculo_vivas_idx` es parcial (`where eliminado_en is null`) y no sirve a la FK para las notas
  borradas; borrarlo dejaría la cascada de un vehículo sin índice.
- **D2 · El acceso de `logistica_unidad` es el de la cadena** (`_logistica_alcance` + el «propios» de la policy de `vehiculos`), no un `puede_vehiculo(…,
'logistica.ver')` suelto: el panel y la tarjeta se ven con la misma regla. Inexistente, papelera y sin acceso: un solo texto (D4 de 6.02-1).
- **D3 · «Dónde está» busca sólo en orígenes con la regla `logistica` activa:** elegir un resultado cambia a la pestaña de su origen (6.03), y esas pestañas
  son las de esa regla. Todo origen nuevo la trae activa (`origen_crear_flujo`).
- **D4 · «Fuera de regla» = algún bloqueante sin cumplir en su fase actual** (el criterio de `flujo_fuera_de_regla`); `faltan` lleva sólo esos. Sin fase, nada falta.
- **D5 · `movida` sin la nota:** la nota la muestran «Notas» e «Historial» (6.04) con su paginación; aquí sólo quién y cuándo.
- **D6 · Un texto corto o vacío no es error:** `{unidades: [], hay_mas: false}`; sólo uno de más de 100 caracteres da 22023 hint `p_buscar`.
- **D7 · Sin orígenes visibles, vacío y no 42501:** «dónde está» cruza orígenes; vacío no dice nada de lo que no se ve.
- **D8 · Orden:** el VIN o el lote exactos primero, luego lo más nuevo. Con más de 1.000 coincidencias de título se toman 1.000 cualesquiera; con «propios»,
  el rescate por `vehiculos_creador_idx` trae sólo lo que creó quien busca, no lo de su cartera creado por otra persona (el límite de `buscador_cotizaciones`).
- **D9 · `titulo` tal cual:** el título con el campo principal (6.13) lo compone la interfaz.
- **D10 · «Dónde está» busca por título, VIN y lote,** no por contenedor ni booking (son filtros de la cadena, con igualdad, y sus índices no sirven a un `ilike`).
