# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-14
**Fase actual:** 3 — Leads, **parte 4b de 8 hecha** (la ficha está completa: edición y teléfonos). Sigue la 5.

## Funcionando

- Verdes: lint, typecheck, test, `db:probar`, `mapa.sh`, build y `test:e2e` (números en `docs/BITACORA.md`).
  Fases 0 a 2 completas, y las partes 1 a 4b de la Fase 3.
- **Ficha del lead** (`/leads/[id]`): cabecera, «Datos» (fijos, teléfonos, campos por grupo) y edición en
  `?panel=editar-lead` por `lead_guardar` (versión, borrador, reintento, conflicto). Teléfonos y privados
  recortados en la base; inexistente, ajeno, limbo y papelera se ven igual. Se llega por «Abrir», «Abrir
  ficha» y el drawer del listado. **Teléfonos** (sólo con el lead en la cartera): «Cambiar» el principal
  (`?panel=cambiar-telefono`; el anterior queda «Anterior») y extras en línea con «Deshacer».
- **Listado de leads** (`/leads`): «míos» por defecto; «todos» con alcance «todos» (teléfono enmascarado,
  sin los privados ajenos; filtrar por uno no encuentra nada y lo dice). Filtros, búsqueda, vistas, drawer.
- **Alta rápida** (botón o `N`): teléfono verificado al tipear y primer seguimiento en una RPC. **Campos
  de los leads** configurables. **Orígenes y vehículos** completos (apibara y limpieza incluidas).

## Siguiente: Fase 3 — Leads (`docs/PLAN.md`), lo que falta

Una por sesión: **5)** seguimientos (Tiptap, RPC propias), recordatorios, favoritos, tachados («no
tachados» en el listado) y etiquetas. **6)** cartera, papelera de leads y vínculo e interesados. **7)**
embudos (`?vista=embudo`) y portal. **8)** CSV con las columnas del layout.

## Pendientes que se arrastran

- **Parte 5:** las policies directas de `seguimientos` (no miran que el tipo esté activo) y de
  `recordatorios` (no miran el acceso al lead) se cierran con RPC; el editor muestra `detalle_texto`. Lo
  derivado que sume va **fuera** de `lead_version()`. La base ya tiene un campo propio `tachado`: no
  choca en la URL (`a.tachado`) pero sí de nombre en pantalla (`docs/DECISIONES.md`).
- **Parte 6 (antes de invitar a un asesor con leads reales):** quien tiene `leads.editar` «todos» puede
  compartirse un lead ajeno y no se mira si el destino está activo. **La papelera de leads va acá.**
- **Fase 4:** la cotización final como ancla de la limpieza; desvincular con cotización final; campos del
  lead en la tarjeta o el PDF. **Fase 6:** mover de fase y publicar sin mover la versión de la ficha; la
  papelera manual no mira `documentos`. **Fases 7 y 8:** el CTA «Escribirle por chat»; la notificación
  de la limpieza; el buscador de leads, sin los privados; el atajo `?` sin lista.
- **Fase 9:** medir con 5 a 10 mil registros (filtrar leads por un atributo ~0,06 ms por fila; si pesa,
  una función que recorta una vez por consulta); Actividad leerá el diff recortado. Sin remoto: `.github/` no corrió.

## Lista para la nube (una persona)

- Proyecto y `supabase link`; primer `db push --include-seed`; plantillas de correo; `Site URL`; SMTP;
  Google; `supabase functions deploy storage-gc` y `apibara`, y `select public.storage_gc_programar(
'https://<ref>.supabase.co/functions/v1/storage-gc');` (sin eso la purga deja los archivos).
- **El día del primer `db push`** `db:base` se congela (la migración base ya estará aplicada) y los cambios
  son sólo migraciones: cambia la regla de `docs/DECISIONES.md` (2026-10-11) y el chequeo de `db:probar`.
- **Jobs** (`limpieza-automatica`, `apibara-consultas-purgar`, `papelera-purgar`): comprobar en `cron.job`
  (`pg_cron` corre en UTC) y que el runtime inyecta `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`.
- **Siembra:** un permiso nuevo en una base viva lleva su `insert … on conflict` y la concesión al dueño
  en la misma migración; `origenes_lead` y `tipos_seguimiento` sólo están en `seed.sql`. Cargar el
  **código de país** en Empresa › Región.

## Deuda aceptada y pendiente de decidir

- **Por decidir:** dominancia sobre la persona; vencimiento de la invitación (`otp_expiry`); fotos de una
  subasta en segundo plano; rango de un campo numérico; separar `leads.campos.gestionar`.
- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`; `marca` y
  `avatares` borran con `quitarSiHuerfano()`. `cambiar_fase` acepta `p_fase_esperada` nulo.
- `vehiculos.papelera.purgar` gobierna también la papelera de leads y cotizaciones, sin versión ni
  purga automática. `web.solicitar_asesor` no valida el vehículo; `cotizacion_marcar_final` vincula sin
  mirar la papelera. `limpieza_el` corre con los derechos de la base. Despublicar no revoca la URL de una foto.
- **Guardia de e2e:** respalda sólo la fila de apibara en `e2e/.estado/respaldo.json`; tras un `kill -9`,
  volver a correr (lo repone antes): **un respaldo viejo pisa un cambio hecho a mano entre corridas**
  (`docs/DECISIONES.md`). Exige `npx supabase functions serve`. Con cuentas reales se saltan «la primera
  persona nace dueña» y el guardián. **Intermitente:** `vehiculos-fotos` en móvil falla 1 de cada 3 (también
  en el commit base: la página anterior sigue un momento en el DOM). La 4b no corrió `empresa.spec`: correrla.
- «Ver como» acota la interfaz, no las filas que entrega la base (en leads fuerza «míos»). `storage-gc` y
  `apibara` (Deno) no entran en lint ni typecheck. Falta probar fotos en iPhone. Apibara está apagada en
  la base local. `tipo_acceso = 'adoptado'` quedó sin uso. La ficha de leads parte los números con el
  código del lead: un extra de otro país se ve sin partir.
- Dos mensajes de RPC hablan de vos: `cambiar_fase` y la fórmula. Sin interfaz: `demora_dias_default`,
  `lead_dormido_meses`, el logo oscuro, `push_web`, `web_publica`, `ajustes_web.origenes_visibles`,
  `fases.publica_web`, el `icono` y el orden de los orígenes. Sin enforcement: `equipo.usuarios.ver`,
  `equipo.roles.ver`, `tablero.metricas.ver`, `datos.exportar.todo`, `notificaciones.push`, `logistica.pagos.confirmar`.
