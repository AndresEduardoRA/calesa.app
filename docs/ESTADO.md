# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-13
**Fase actual:** 2 — Orígenes y vehículos, **abierta**. Hechas las partes 1 (orígenes), 2
(vehículos), 3 (fotos, vínculo e interesados) y 4 (vitrina y papelera); falta la 5, en sesión nueva.

## Funcionando

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:probar`, `bash scripts/mapa.sh --check`,
  `pnpm build` y `pnpm test:e2e` (los números de la última corrida están en `docs/BITACORA.md`).
- **Fase 1** completa. **Orígenes**, **vehículos**, **fotos**, y el vínculo e interesados de sólo
  lectura (su interfaz de escritura llega con leads).
- **Vitrina:** «Publicar en la web» en la ficha, con precio público y «así lo verá el visitante»;
  el listado dice cuál está en vitrina y cuál publicado sin verse, y lo filtra. `web.vehiculos`
  da sólo identidad, precio público, campos públicos y la portada con su miniatura.
- **Papelera:** enviar desde la ficha o en lote desde el listado, con «Deshacer»;
  `/vehiculos/papelera` por lote, restaurar uno o el lote, purgar con confirmación (tipeada para un
  lote). Todo por RPC propias, con versión y resultado parcial.
- **Limpieza de Storage:** la función `storage-gc` y los jobs existen y corren en local. La purga
  automática (`papelera-purgar`, 03:30) la programa la migración.

## Siguiente: Fase 2, parte 5

- apibara (alta por enlace o lote, fotos por URL) y subastas próximas en la ficha. Sin escritor
  todavía: `subasta_*`, `estado_subasta`, `apibara_*`. Las fotos que traiga pasan por
  `vehiculo_fotos_agregar` (el trigger exige que los dos objetos existan y sean `.webp` o `.jpg`).
- Fase 3 (leads): la interfaz que vincula y marca interesados vive en `vehiculos`. Hasta entonces
  un vehículo vinculado no se puede mandar a la papelera (no hay cómo desvincular desde la app).

## Lo que el plan no había previsto (parte 4)

- **`pg_cron` y `pg_net` nunca se habían instalado:** ningún job corrió jamás, y `papelera_dias` no
  hacía nada. Los instala `…001000`. Siguen **sin programar** `recordatorios`, `web-expirar`,
  `alertas-demora` y `actividad-purgar` (`actividad_dias` tampoco hace nada): con su fase.
- `web.vehiculos` exponía diez columnas más que la frontera pedida (kilometraje, lote, subasta, VIN
  parcial, fase, negociable, permuta, la galería): salieron. Vuelven, una por una, con el sitio.
- Publicar ≠ verse: fase que publica, origen visible y web encendida, y **ninguna de las tres tiene
  pantalla** (Fases 5 y 8): hoy todo lo publicado dice «Publicado, no visible», con el motivo.
- Un vehículo con comprobante anulado, pagos o gastos entraba a la papelera y la purga reventaba, o
  se los llevaba en cascada. Ahora no entra, y la purga vuelve a preguntar.
- **Fallo previo de los filtros en el celular, corregido:** elegir un filtro y tocar «Ver
  resultados» antes de que respondiera el servidor dejaba la URL filtrada y la lista sin filtrar.

## Pendiente de decidir

- **Dominancia sobre la persona** y **vencimiento de la invitación** (`otp_expiry` de Auth).
- **En la nube (una persona):** proyecto y `supabase link`; primer `db push --include-seed`;
  plantillas de correo; `Site URL`; SMTP; Google. **Nuevo:** `supabase functions deploy storage-gc`
  y `select public.storage_gc_programar('https://<ref>.supabase.co/functions/v1/storage-gc');`
  (sin eso la purga borra filas y los archivos se quedan). Comprobar que `create extension pg_cron`
  pasa con el rol de las migraciones y que el runtime inyecta `SUPABASE_SERVICE_ROLE_KEY`.

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`; `marca` y
  `avatares` siguen borrando con `quitarSiHuerfano()` (cuenta y después borra).
- `cambiar_fase` acepta `p_fase_esperada` nulo. Mover de fase y publicar mueven la versión del
  vehículo: quien edita la ficha en ese momento ve un conflicto.
- `vehiculos.papelera.purgar` es global y gobierna también la papelera de leads y cotizaciones;
  sus `papelera_*` genéricas siguen sin versión y sin purga automática hasta sus fases.
- `web.solicitar_asesor` guarda el vehículo que le pasan sin validar (distingue si un uuid existe);
  `cotizacion_marcar_final` vincula sin mirar la papelera. Fases 8 y 4.
- Despublicar no revoca la URL de una foto que alguien ya tenga (bucket público).
- `storage-gc` (Deno) no entra en lint ni typecheck: la cubre el e2e. Si deja de correr no avisa
  nadie más que la papelera (a quien puede vaciarla). `cron.job_run_details` crece sin purga.
- Sin interfaz todavía: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web` y
  `web_publica`; `ajustes_web.origenes_visibles`; `fases.publica_web`; el `icono` y el orden de los
  orígenes; vincular y marcar interesados.
- Los e2e (salvo los del inventario) exigen la base local sin personas ajenas (`pnpm db:reset`) y
  no corren en paralelo. Los de vitrina y papelera necesitan el edge-runtime local arriba
  (`npx supabase stop && npx supabase start` si quedó caído). Falta probar las fotos en un iPhone.
- Las RPC de leads, flujos y cotizaciones siguen hablando de vos: se reescriben con su fase.
- Sin enforcement en la base: `equipo.usuarios.ver`, `equipo.roles.ver`, `tablero.metricas.ver`,
  `datos.exportar.todo`, `notificaciones.push`, `logistica.pagos.confirmar`.
- Un hook frena todo comando de Bash que nombre la secret key: usar `docker exec … psql`.
