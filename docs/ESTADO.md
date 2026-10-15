# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-14
**Fase actual:** 3 — Leads, **parte 3 de 8 hecha** (listado con filtros, vistas y drawer rápido). Sigue la 4.

## Funcionando

- Verdes: lint, typecheck, test, `db:probar`, `mapa.sh`, build y `test:e2e` (números en
  `docs/BITACORA.md`). Fases 0 a 2 completas, y las partes 1 a 3 de la Fase 3.
- **Listado de leads** (`/leads`, `leads.ver`): «míos» por defecto; «todos» sólo con alcance «todos»
  (teléfono enmascarado, sin los «solo la cartera» de lo ajeno; filtrar por uno no encuentra nada y lo
  dice). Filtros del layout, tipo, origen, búsqueda por nombre o número, vistas guardadas y drawer de
  sólo lectura en `?lead=`. Aún sin ficha.
- **Alta rápida** (botón o `N`, con `leads.crear`): teléfono verificado al tipear y primer seguimiento
  en una RPC. **Campos de los leads** configurables (Configuración › Leads). **Orígenes y vehículos**
  completos (ficha, fotos, vitrina, papelera, apibara y limpieza automática).

## Siguiente: Fase 3 — Leads (`docs/PLAN.md`), lo que falta

Una por sesión: **4)** ficha con edición (`lead_guardar`) y teléfonos, con «Abrir» y «Abrir ficha» del
alta. **5)** seguimientos (Tiptap, RPC propias), recordatorios, favoritos, tachados (y «no tachados» en
el listado) y etiquetas. **6)** cartera, papelera de leads y vínculo e interesados. **7)** embudos
(`?vista=embudo`) y portal. **8)** CSV con las columnas del layout y orígenes de lead.

## Pendientes que se arrastran

- **Parte 4:** `leads_telefonos` no se enmascara a quien ve el lead sin la cartera y `telefono_lead(id)`
  no comprueba acceso (antes de que la ficha muestre teléfonos); «Abrir» y «Abrir ficha» sin enlace hoy.
  El trigger de `ultimo_seguimiento_en` mueve la versión de edición del lead (`actualizado_en`): cada
  seguimiento nuevo daría conflicto a quien edita la ficha; esa columna no debe moverla (como «Conservar»).
- **Parte 5:** las policies directas de `seguimientos` (no miran que el tipo esté activo) y de
  `recordatorios` (no miran el acceso al lead) se cierran con RPC; el editor muestra `detalle_texto`.
- **Parte 6 (antes de invitar a un asesor con leads reales):** quien tiene `leads.editar` «todos» puede
  compartirse un lead ajeno y no se mira si el destino está activo (`docs/DECISIONES.md`, 2026-10-14).
  **La papelera de leads no estaba asignada a ninguna parte:** va acá.
- **Fase 4:** la cotización final como ancla de la limpieza; desvincular con cotización final; campos del
  lead en la tarjeta o el PDF. **Fase 6:** mover de fase y publicar sin mover la versión de la ficha; la
  papelera manual no mira `documentos`. **Fases 7 y 8:** el CTA «Escribirle por chat» (sin acción); la
  notificación de la limpieza; el buscador de leads, sin los privados; la web llenando campos del lead;
  el atajo `?` está en el catálogo y nada dibuja la lista.
- **Fase 9:** medir con 5 a 10 mil registros (listados, filtros, papelera): filtrar leads por un atributo
  cuesta ~0,08 ms por fila (si pesa, una función que recorta una vez por consulta); Actividad lee el
  diff por una función que recorta según la cartera. Sin remoto de git: `.github/` no corrió.

## Lista para la nube (una persona)

- Proyecto y `supabase link`; primer `db push --include-seed`; plantillas de correo; `Site URL`; SMTP;
  Google; `supabase functions deploy storage-gc` y `apibara`, y `select public.storage_gc_programar(
'https://<ref>.supabase.co/functions/v1/storage-gc');` (sin eso la purga deja los archivos).
- **Jobs** (`limpieza-automatica`, `apibara-consultas-purgar`, `papelera-purgar`): comprobar en `cron.job`
  (`pg_cron` corre en UTC) y que el runtime inyecta `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`.
- **Siembra:** un permiso nuevo en una base viva lleva su `insert … on conflict` y la concesión al dueño
  en la misma migración; `origenes_lead` y `tipos_seguimiento` sólo están en `seed.sql`. Cargar el
  **código de país** en Empresa › Región.

## Deuda aceptada y pendiente de decidir

- **Por decidir:** dominancia sobre la persona; vencimiento de la invitación (`otp_expiry`); fotos de una
  subasta en segundo plano (hoy en el navegador); rango de un campo numérico; separar `leads.campos.gestionar`.
- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`; `marca` y
  `avatares` borran con `quitarSiHuerfano()`. `cambiar_fase` acepta `p_fase_esperada` nulo.
- `vehiculos.papelera.purgar` gobierna también la papelera de leads y cotizaciones, sin versión ni
  purga automática. `web.solicitar_asesor` no valida el vehículo; `cotizacion_marcar_final` vincula sin
  mirar la papelera. `limpieza_el` corre con los derechos de la base. Despublicar no revoca la URL de una foto.
- **Guardia de e2e:** respalda sólo la fila de apibara en `e2e/.estado/respaldo.json`. Tras un `kill -9`,
  volver a correr (lo repone antes) o borrar el archivo si cambiaste apibara a mano: **un respaldo viejo
  pisa un cambio hecho a mano entre corridas** (`docs/DECISIONES.md`, 2026-10-14). Exige
  `npx supabase functions serve`. Con cuentas reales, «la primera persona nace dueña» y el guardián se saltan.
- «Ver como» acota la interfaz, no las filas que entrega la base (en leads fuerza «míos»). `storage-gc` y
  `apibara` (Deno) no entran en lint ni typecheck. Falta probar fotos en iPhone. Apibara está apagada en
  la base local: se enciende en Integraciones. `tipo_acceso = 'adoptado'` quedó sin uso.
- Dos mensajes de RPC hablan de vos: `cambiar_fase` y la fórmula. Sin interfaz: `demora_dias_default`,
  `lead_dormido_meses`, el logo oscuro, `push_web`, `web_publica`, `ajustes_web.origenes_visibles`,
  `fases.publica_web`, el `icono` y el orden de los orígenes. Sin enforcement: `equipo.usuarios.ver`,
  `equipo.roles.ver`, `tablero.metricas.ver`, `datos.exportar.todo`, `notificaciones.push`, `logistica.pagos.confirmar`.
