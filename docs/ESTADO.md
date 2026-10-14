# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-14
**Fase actual:** 2 — Orígenes y vehículos, **cerrada** el 2026-10-14. **Siguiente: Fase 3** (leads).

## Funcionando

- Verdes: lint, typecheck, test, `db:probar`, `scripts/mapa.sh --check`, build y `test:e2e`
  (números en `docs/BITACORA.md`). Fases 0, 1 y 2 completas (`docs/PLAN.md`).
- **Orígenes y vehículos:** orígenes de subasta o manuales con su flujo y su layout; listado con filtros
  en la URL y vistas guardadas; ficha, alta y edición; fotos; vitrina; papelera por lotes con purga y
  `storage-gc`; vínculo e interesados (de sólo lectura hasta la Fase 3).
- **apibara:** alta por enlace, VIN o lote (hasta 20), «Refrescar» y fotos. La función guarda cada
  consulta (`apibara_consultas`) y el alta y el refresco sólo mandan su id: nadie falsea desde el
  navegador la fecha ni el estado de una subasta.
- **Limpieza automática:** cada madrugada (desde las 03:00 de la zona de la empresa) manda a la
  papelera, en un lote «Limpieza automática», lo importado de una subasta que terminó hace más de 7
  días (configurable, con interruptor, en Empresa › Políticas) y no tiene ancla. Antes se avisa: filtro
  «Se limpiará pronto», insignia y banner con «Conservar». La regla es de la base (`limpieza_el`).

## Siguiente: Fase 3 — Leads (`docs/PLAN.md`)

- Vincular y marcar interesados vive en `vehiculos` (RPC y lectura listas, sin interfaz).

## Pendientes que se arrastran

- **Fase 4:** la cotización final como ancla de la limpieza (una línea en `_limpieza_ancla()`, con su
  comentario); si se puede desvincular un vehículo con cotización final; las rutas de flujo y de fórmula
  en `app/(app)/configuracion/origenes/pasos.ts`.
- **Fase 6:** mover de fase y publicar sin mover la versión de la ficha (el patrón de «Conservar»); la
  papelera manual no mira `documentos` (la purga se los lleva en cascada).
- **Fase 7:** la notificación de la limpieza.
- **Fase 9:** medir con 5 a 10 mil vehículos: el listado (`limpieza_el` por fila), los filtros sobre
  `atributos` y la papelera.
- **Remoto de git y CI:** no hay remoto; `.github/` existe y todavía no corrió.

## Lista para la nube (una persona)

- Proyecto y `supabase link`; primer `db push --include-seed`; plantillas de correo; `Site URL`; SMTP;
  Google. `supabase functions deploy storage-gc` y `apibara`, y
  `select public.storage_gc_programar('https://<ref>.supabase.co/functions/v1/storage-gc');` (sin eso la
  purga borra filas y los archivos se quedan). La clave de apibara se carga en Integraciones.
- **Programar el job de limpieza:** `limpieza-automatica` (cada hora; actúa una vez por día local desde
  las 03:00) lo programa la migración: comprobar en `cron.job` que quedó, con `apibara-consultas-purgar`
  y `papelera-purgar`, y que `create extension pg_cron` pasa con el rol de las migraciones. `pg_cron`
  corre en UTC: `papelera-purgar` (03:30) es la madrugada de Greenwich. Comprobar que el runtime inyecta
  `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`.

## Pendiente de decidir

- **Dominancia sobre la persona** y **vencimiento de la invitación** (`otp_expiry`).
- **Fotos de una subasta en segundo plano:** hoy van en el navegador (cerrar la pestaña las deja para
  «Traer las que faltan»). Revisar con uso real.
- **Nombres de proveedor:** quedan «apibara», «Copart» e «IAAI» donde se configura la integración y en
  las etiquetas del catálogo (`docs/DECISIONES.md`, 2026-10-14).

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`; `marca` y
  `avatares` borran con `quitarSiHuerfano()` (cuenta y después borra).
- `cambiar_fase` acepta `p_fase_esperada` nulo. Mover de fase y publicar mueven la versión del vehículo.
- `vehiculos.papelera.purgar` es global y gobierna también la papelera de leads y cotizaciones, que
  siguen sin versión ni purga automática. `web.solicitar_asesor` no valida el vehículo y
  `cotizacion_marcar_final` vincula sin mirar la papelera (fases 8 y 4).
- `limpieza_el` corre con los derechos de la base: un nulo revela que algo retiene al vehículo, que
  quien lista ya ve, aunque no lea sus pagos o documentos.
- Despublicar no revoca la URL de una foto que alguien ya tenga (bucket público).
- `storage-gc` y `apibara` (Deno) no entran en lint ni typecheck: las cubren sus e2e y un test en Node.
- Con cuentas reales en la base local, «la primera persona nace dueña» y el guardián se saltan (corren
  en CI). Vitrina, papelera y apibara necesitan `npx supabase functions serve`. Falta probar fotos en iPhone.
- Tres mensajes de RPC de leads, flujos y cotizaciones hablan de vos; ninguna pantalla las llama aún.
- Sin interfaz: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web`, `web_publica`,
  `ajustes_web.origenes_visibles`, `fases.publica_web`, el `icono` y el orden de los orígenes. Sin
  enforcement: `equipo.usuarios.ver`, `equipo.roles.ver`, `tablero.metricas.ver`, `datos.exportar.todo`,
  `notificaciones.push`, `logistica.pagos.confirmar`.
