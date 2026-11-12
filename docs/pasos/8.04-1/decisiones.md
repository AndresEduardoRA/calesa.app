## 2026-11-12 · Decisiones del paso 8.04-1 (la base del tablero de la cola web, las solicitudes por cursor y el job)

- **D1** · **Una lectura propia, sin tocar `estado_cola_web`**: `cola_web_tablero()` lista **todas** las habilitadas, con `en_la_rueda` calculado por
  `puede_estar_en_la_rueda()`. La vista queda como está: filtra por la rueda y esconde justo a quien está habilitada sin el permiso (8-1).
- **D2** · **Respuesta `jsonb` `{filas, hay_mas}`**, como `agenda_tareas_sin_fecha`: la base lee `tope + 1`. El tablero, `_acotar_pagina(p_tope, 100, 200)`
  (100 = `TOPE_DEL_EQUIPO`: la rueda no pasa del equipo); las solicitudes, `_acotar_pagina(p_tamano, 20, 50)` (20 = `TAMANO_DE_VER_MAS`). Los registros de
  `scripts/guardas/areas-b/paginas-en-la-base.ts` entran en la 8.04-2, con su llamada: la guarda exige que cada entrada tenga quién la llame.
- **D3** · **El índice va `(estado, creado_en desc, id desc)`**, no `(…, id)` como decía la fila: el orden de la lista es `creado_en desc, id desc` y el
  cursor `(creado_en, id) < (c, i)` sólo es condición de índice con las dos columnas en el mismo sentido.
- **D4** · **«Sin asignar» = todas las `sin_asignar`, de la más nueva a la más vieja, por cursor**, sin recorte por fecha (no esconder nada). El número que
  dibuje la 8.04-2 es el de la primera página («más de 20»), nunca un `count(*)`.
- **D5** · **El título del vehículo sale de `web.vehiculos`** (lo que el visitante vio; nulo si dejó de verse): costos y VIN quedan fuera por construcción.
- **D6** · **El tablero no devuelve el WhatsApp**, sólo `falta_whatsapp`; una solicitud tampoco trae `token_visitante`, `utm` ni `lead_id`.
- **D7** · **`cuenta_activa` aparte de `en_la_rueda`**: `puede_estar_en_la_rueda()` también es falso con la cuenta bloqueada o inactiva, y la pantalla no
  debe decir «su rol no recibe turnos» de quien está bloqueada.
- **D8** · **`cola_web_configurar` no cambia** (upsert sin versión, última escritura gana): `cola_web_asesores` es de configuración y no tiene
  `actualizado_en`; ponerle versión es otra RPC y otro paso.
- **D9** · **`aplicado_en` de `web.cola.gestionar` se actualiza en la migración y en `supabase/seed.sql`**: el seed corre después de las migraciones con
  `on conflict (clave) do update … aplicado_en = excluded.aplicado_en` y, sin tocarlo, dejaba el texto viejo en local y en el CI (auditoría del plan).
- **D10** · **El job va en su propia migración**, `web-expirar-solicitudes` cada 5 minutos con el límite por defecto de la función (200 por corrida);
  comando sin URL. Cierra el arrastrado «el job `web_expirar_solicitudes` se programa con esta fase».
- **D11** · **`abiertas` del tablero es un conteo exacto a propósito**: el orden de la rueda que dibuja la app es el espejo del de `web.solicitar_asesor`,
  que cuenta igual; lo acota el cupo de cada persona (≤ 50) y va por `solicitudes_web_asesor_abiertas_idx`. Dicho en el comentario de la función.
- **D12** · **Para la 8.04-2:** `ruta` de una solicitud es texto libre del visitante anónimo (`web.solicitar_asesor`, `p_ruta`): la pantalla lo dibuja
  como texto, nunca como enlace ni como HTML (auditoría del informe).
