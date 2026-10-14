# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-14
**Fase actual:** 2 — Orígenes y vehículos, **abierta**. Hechas las partes 1 a 5 (orígenes,
vehículos, fotos y vínculo, vitrina y papelera, apibara); falta la 6 (limpieza automática de
vehículos de subasta que no se compraron, y el cierre), en sesión nueva.

## Funcionando

- Verdes: lint, typecheck, test, `db:probar`, `scripts/mapa.sh --check`, build y `test:e2e`
  (números en `docs/BITACORA.md`). **Fase 1** completa y, de la 2, lo que sigue.
- **apibara:** en un origen de subasta con la integración encendida, «Nuevo» acepta un enlace de
  Copart o IAAI, un VIN o un lote (hasta 20, una por línea, con resultado por línea). Llena la
  ficha (editable), detecta repetidos y tras guardar trae las primeras 24 fotos. Apagada o con la
  API caída (cuota, clave, no encontrado, corte), se sigue a mano con lo pegado.
- **Se guarda todo lo que devuelve la API:** la respuesta entera (`apibara_raw`) y un campo por
  cada dato normalizado (106; no públicos). Fecha, estado (`abierta`, `en_vivo`, `terminada`,
  `vendida`) y última consulta, en columnas con índice.
- **Subasta en la ficha:** fecha con cuenta regresiva, estado, puja y «Refrescar» (no pisa lo
  editado); «Traer las fotos que faltan» en Fotos; «Ver uso» de la cuota en Integraciones.
- **La clave no llega al navegador:** la lee la edge function `apibara` (Vault) y la llama el
  navegador con su sesión; la base dice antes qué puede esa persona en ese origen.

## Siguiente: Fase 2, parte 6

- Limpieza automática de vehículos de subasta que no se compraron (`terminada`, sin ancla). Ya
  están `vehiculos_subasta_estado_idx`, `apibara_sync_en` y `_vehiculo_subasta_desde()`; **no** el
  job, la regla de «sin ancla» ni qué hace con un estado viejo (nadie lo refresca solo).
- Fase 3 (leads): vincular e interesados vive en `vehiculos`; hasta entonces un vehículo
  vinculado no va a la papelera (no hay cómo desvincularlo).

## Lo que el plan no había previsto (parte 5)

- **La dirección de apibara estaba mal** (`api.apibara.tech`; la real es
  `https://apibara.tech/api/v1/vehicle-auction`): una migración corrige la fila. Las 17
  `clave_apibara` del preset eran adivinadas.
- **`docs/PRODUCTO.md` no define «subastas próximas en la ficha»:** se tomó como la subasta de ese
  vehículo (`docs/DECISIONES.md`); la lista `upcoming=only` no se usa.
- Plan «Test»: 100 consultas por período; `/image-proxy` y `/usage` parecen no contarse. Sin
  `db:reset`: la base local tiene una cuenta real y su clave.

## Pendiente de decidir

- **Dominancia sobre la persona** y **vencimiento de la invitación** (`otp_expiry`).
- **En la nube (una persona):** proyecto y `supabase link`; primer `db push --include-seed`;
  plantillas de correo; `Site URL`; SMTP; Google. `supabase functions deploy storage-gc` y
  `select public.storage_gc_programar('https://<ref>.supabase.co/functions/v1/storage-gc');`
  (sin eso la purga borra filas y los archivos se quedan); y `supabase functions deploy apibara`
  (la clave se carga en Integraciones). Comprobar que `create extension pg_cron` pasa con el rol de
  las migraciones y que el runtime inyecta `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`.
- **Fotos de una subasta en segundo plano:** hoy van en el navegador (cerrar la pestaña las deja
  para «Traer las que faltan»). Revisar con uso real.

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`; `marca` y
  `avatares` borran con `quitarSiHuerfano()` (cuenta y después borra).
- `cambiar_fase` acepta `p_fase_esperada` nulo. Mover de fase y publicar mueven la versión del
  vehículo: quien edita en ese momento ve un conflicto.
- `vehiculos.papelera.purgar` es global y gobierna también la papelera de leads y cotizaciones, que
  siguen sin versión ni purga automática hasta sus fases. `web.solicitar_asesor` no valida el
  vehículo y `cotizacion_marcar_final` vincula sin mirar la papelera (fases 8 y 4).
- `apibara_raw` lo manda el navegador: quien crea o edita podría falsear el estado de lo suyo.
  Importa cuando la limpieza borre por él: la parte 6 decide si re-consulta antes.
- Despublicar no revoca la URL de una foto que alguien ya tenga (bucket público).
- `storage-gc` y `apibara` (Deno) no entran en lint ni typecheck: las cubren sus e2e y, la de
  apibara, un test que la carga en Node con un `fetch` simulado. `cron.job_run_details` crece.
- Con cuentas reales en la base local, «la primera persona nace dueña» y el guardián se saltan
  (corren siempre en CI). Vitrina, papelera y apibara necesitan el edge runtime local arriba
  (`npx supabase functions serve`). Falta probar las fotos en un iPhone.
- Las RPC de leads, flujos y cotizaciones hablan de vos (se reescriben con su fase).
- Sin interfaz: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web`,
  `web_publica`, `ajustes_web.origenes_visibles`, `fases.publica_web`, el `icono` y el orden de los
  orígenes. Sin enforcement: `equipo.usuarios.ver`, `equipo.roles.ver`, `tablero.metricas.ver`,
  `datos.exportar.todo`, `notificaciones.push`, `logistica.pagos.confirmar`.
