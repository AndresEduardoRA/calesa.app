## 2026-11-12 — Paso 6.07-1: la escritura del transporte

- **D1 · Los grupos se ordenan por clave**, con filtros y prefijo, no por ETA (ordenar por ETA agrupa toda la tabla). Va en 6.07-3.
- **D2 · Una declaración muestra sólo los vehículos que quien mira ve.** La cabecera, a quien ve al menos uno o tiene `logistica.aduana.gestionar`.
  Va en 6.07-3.
- **D3 · El canal de aforo se puede cambiar con la versión**, pero no vuelve a nulo: la composición sigue congelada. Va en 6.07-2.
- **D4 · El paso se parte en tres:** la escritura del transporte, la de aduana y las lecturas paginadas.
- **D5 · Contenedor y booking en mayúsculas y sin espacios**, vacío = nulo, sólo `A-Z 0-9 . / -` y hasta 40. No se valida el dígito de control ISO 6346:
  uno mal calculado frenaría cargas reales.
- **D6 · Una unidad sin fase no recibe contenedor:** `permite_contenedor` es de la fase.
- **D7 · Una naviera o puerto nuevo** debe existir, estar activo y, si la oferta del flujo para su tipo no está vacía, estar en ella. Lo ya guardado se
  conserva aunque salga de la oferta o se inactive.
- **D8 · ETA y arribo no pueden ser antes del zarpe**; se valida sólo si cambia alguna de las tres fechas. Las fechas van como `AAAA-MM-DD`.
- **D9 · `sigue_al_vehiculo` no se cambia aquí** (lo decide repuestos, 8.x); a un repuesto que sigue a su vehículo no se le pone naviera, contenedor ni
  booking.
- **D10 · El trigger mira la fase de la unidad dueña de la fila.** Un repuesto que sigue a su vehículo no frena vaciar el transporte del vehículo: queda
  para 8.08, que recrea `evaluar_requisitos`.
- **D11 · Con la esperada nula y la fila ya existente, PT409 siempre**, aun sin diferencias. Fuera de eso, sin diferencia no escribe ni mueve la versión.
- **D12 · Un grupo se lee y se aplica sobre a lo sumo 200 filas**; con más, `hay_mas` al leer y 22023 (`hint = 'grupo'`) al aplicar. Las notas no se
  aplican a un grupo: son de cada unidad.
- **D13 · Al aplicar, el permiso antes que la versión:** una unidad del grupo que no veo o no puedo editar da 42501, sin decir cuántas.
- **D14 · La carrera vive en `supabase/tests/areas/transporte/`** (como las de dinero y mover), no en `scripts/carreras/`; `scripts/carreras.mjs` sólo
  suma su import y su llamada.
- **D15 · `transporte_grupo` devuelve por unidad sus datos y si es `editable`:** 6.08 los necesita para «varios» y para apagar con motivo.
- **D16 · Para un repuesto, la clave es `repuestos.editar`** (la de la policy de antes).
- **D17 · No se borra una naviera que una unidad usa si su fase exige `transporte.naviera` como bloqueante:** el `on delete set null` dispara el
  trigger y da 23514. Es conducta nueva del catálogo; 6.08 la muestra con un mensaje humano. Un borrado de naviera a la vez que un aplicar al mismo
  grupo puede dar 40P01: es raro y se acepta.
- **D18 · Leer un grupo pide `logistica.ver` o `repuestos.ver` en algún origen, y aplicarlo, la clave de editar:** sin eso, 42501 antes de tocar nada.
  Si no, cualquier cuenta podría probar números de booking y saber si existen.
- **D19 · La fila de una unidad en la papelera no es del grupo:** nadie la ve ni la edita, y si contara, el grupo quedaría con `hay_ocultas` y sin poder
  editarse en bloque hasta purgarla o restaurarla.
