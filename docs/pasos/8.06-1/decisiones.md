# 8.06-1: decisiones (2026-11-11)

- **D1 · La dirección vive en un solo lugar.** Va en `integraciones.config.revalidar_url` y el secreto en Vault (`integracion:web_publica`). Esto cierra la
  contradicción 1 de `docs/PLAN.md` (dos casas para la URL). La base es la que avisa al sitio y no lee variables de Vercel. El 8.06-2 borra
  `WEB_PUBLICA_REVALIDAR_URL` y `WEB_PUBLICA_REVALIDAR_SECRETO` de `esquemas.ts`, `.env.example` y `docs/ENTORNOS.md`.
  Mientras pg_net no manda el pedido, el secreto queda en las cabeceras de `net.http_request_queue`. Es lo normal en pg_net, y en Supabase esa tabla no se
  le concede a `authenticated`. `db:probar` no lo puede comprobar, porque en PGlite el doble es `net.pedidos`.
- **D2 · Cola y job cada minuto, no un disparo por cambio.** Una limpieza puede tocar miles de vehículos y serían miles de POST. Se usan triggers por
  sentencia y un pedido por minuto que junta todas las etiquetas.
- **D3 · Qué direcciones se aceptan.** La dirección puede ser `https://`, o `http://localhost|127.0.0.1`, que sirve sólo para «Probar» en local y en el e2e.
  **El job sólo envía a `https://`**, así pg_net nunca le pega a un puerto local del servidor de la base. Riesgo aceptado: la regex acepta IP literales y
  hosts privados. Lo acota que la dirección la fija sólo `empresa.ajustes.gestionar`, que el cuerpo es fijo y que nadie lee la respuesta de pg_net.
  El 8.06-2 rechaza el loopback en producción, para que «Probar» no mande el secreto al localhost del servidor de Next.
- **D4 · Sin índice único ni `on conflict` sobre la etiqueta** (bloqueo de la auditoría del plan). Con `on conflict`, la inserción especulativa espera el
  commit de quien encoló primero. Eso serializaba todas las escrituras de vehículos del minuto y abría interbloqueos nuevos. Ahora es un insert simple
  que deduplica sólo dentro de la propia transacción (columna `transaccion xid8`).
  Tampoco se deduplica contra cualquier fila, como proponía la auditoría. Si una transacción confía en la fila confirmada de otra, el job puede
  consumirla y avisar al sitio antes de que la propia confirme, y ese cambio no se revalidaría.
  Las filas repetidas entre transacciones se borran al enviar (`array_agg(distinct …)`). Si el job no puede enviar, las compacta y deja la más vieja de
  cada etiqueta, así una cola apagada no crece. R7b cae si alguien vuelve a poner un índice único.
- **D5 · Triggers por sentencia sin tablas de transición.** Anotan aunque la sentencia no cambie filas: el peor caso es un pedido por minuto.
- **D6 · Apagar no avisa al sitio.** `web.vehiculos` deja de devolver filas al instante, y lo que el sitio tenga en caché vence por su propia caducidad.
- **D7 (8.06-2) · «Probar» corre en el servidor de Next**, con el cliente admin acotado a `integracion_secreto('web_publica')` y con el permiso comprobado antes.
- **D8 · Encender no exige dirección ni secreto.** Sin ellos, la cola espera y no se pierde nada.
  En `web_publica`, `integracion_guardar` guarda sólo `revalidar_url`, así que un `p_config` sin esa clave la borra. Por eso el 8.06-2 tiene que mandar
  siempre `revalidar_url` junto con la config, o `p_config` nulo cuando sólo enciende o apaga.
- **D9 · La cola de asesores anota sólo con `insert`, `delete` y `update of orden`.** `disponible`, `ultima_asignacion_en` y `asignadas_total`
  cambian con cada turno.
- **`categorias` también anota `vehiculos`** (auditoría, punto 4): `interno.vitrina_vehiculos` publica el nombre de la categoría.
- **La fila `web_publica` pasa a ser catálogo:** está en una migración con `on conflict`, porque la nube no corre el seed.
- **Contrato con el sitio** (lo escribe el 8.06-2 en la ficha de `web`):
  - El pedido es `POST <revalidar_url>`, con `Content-Type: application/json` y `Authorization: Bearer <secreto>`.
  - El cuerpo es `{"etiquetas": [...]}`, ordenadas y sin repetir. `{"etiquetas": []}` es «Probar».
  - Sale a lo sumo un pedido por minuto. pg_net no reintenta: un pedido perdido lo cubre la caducidad del sitio.
