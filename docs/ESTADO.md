# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-15
**Fase actual:** 3 — Leads, **parte 6b hecha** (vehículos en la ficha del lead, `vehiculo_id` en las notas, carreras). Sigue la 7.

## Funcionando

- Verdes: lint, typecheck, test, `db:probar` (matriz de leads y de vínculo, y el cinturón), `db:lint` (sin
  errores), `db:carreras`, `mapa.sh`, build y el e2e completo (números en `docs/BITACORA.md`). Fases 0 a 2
  completas, y las partes 1 a 6b de la Fase 3.
- **Carreras:** `pnpm db:carreras` (dos conexiones reales, sin `sleep`; también en el e2e completo).
- **e2e:** `pnpm test:e2e:completo` resetea la base y corre todo sin saltar ninguna (pide
  `npx supabase functions serve`); un spec suelto: `pnpm test:e2e <spec>`. Apibara sin clave: se
  prueba con lo grabado. Tras un reset, ver el README.
- **Leads (1 a 6b):** alta, campos configurables, listado, ficha (datos, teléfonos, seguimientos,
  recordatorios, **vehículos**: vincular, desvincular e interesados), marcas, «Quién lo tiene» y papelera de
  leads; el vehículo de un seguimiento o un recordatorio. Toda RPC que recibe un lead cae en
  una de tres clases (`docs/DECISIONES.md`, 2026-10-15) y el cinturón de `db:probar` falla si una nueva no
  está auditada. **Orígenes y vehículos** completos. Qué hay en el código: `docs/MAPA.md`.

## Siguiente: Fase 3 — Leads (`docs/PLAN.md`), lo que falta

Una por sesión: **7)** embudos y portal (lo «Visible para el cliente» con `vehiculo_id`: decidir qué ve el
portal). **8)** CSV con las columnas del layout.

## Pendientes que se arrastran

- **Ficha:** «Datos» aporta 43,0 de 44 KB; si se pasa, se recortan las props, no se sube el tope.
- **Lead sin dueño y con compartidos** (tras una baja): lo rescata la supervisión transfiriéndolo con
  `p_dueno_esperado` nulo. **Fase 7:** la notificación al compartir o transferir.
- **Fase 4:** la cotización final como ancla de la limpieza; desvincular con cotización final;
  `cotizacion_marcar_final` toma vehículo → lead (al revés que vincular: posible deadlock); campos del
  lead en la tarjeta o el PDF. **Fase 6:** mover de fase y publicar sin mover la versión de la ficha; la
  papelera manual no mira `documentos`. **Fases 7 y 8:** el CTA «Escribirle por chat»; la notificación
  de la limpieza; el buscador de leads, sin los privados; el atajo `?` sin lista. **Recordatorios a su
  hora:** `recordatorios_notificar()` existe sin cron y su `ruta` nombra el lead aunque su dueño ya no lo
  vea; el push.
- **Fase 9:** medir con 5 a 10 mil registros (`pnpm db:medir`; filtrar leads por un atributo ~0,06 ms por
  fila, y el aviso de tachados ocultos cuenta lo mismo otra vez; el plan a veces recorre el índice y corta;
  si pesa, una función que recorta una vez por consulta); Actividad leerá el diff recortado. Sin remoto,
  `.github/` no corrió: su job e2e no sirve las funciones edge ni usa `test:e2e:completo`.

## Lista para la nube (una persona)

- Proyecto y `supabase link`; primer `db push --include-seed`; plantillas de correo; `Site URL`; SMTP;
  Google; `supabase functions deploy storage-gc` y `apibara`, y `select public.storage_gc_programar(
'https://<ref>.supabase.co/functions/v1/storage-gc');` (sin eso la purga deja los archivos).
- **El día del primer `db push`** `db:base` se congela (la migración base ya estará aplicada) y los cambios
  son sólo migraciones: cambia la regla de `docs/DECISIONES.md` (2026-10-11) y el chequeo de `db:probar`.
- **Jobs** (`limpieza-automatica`, `apibara-consultas-purgar`, `papelera-purgar`): comprobar en `cron.job`
  (`pg_cron` corre en UTC) y que el runtime inyecta `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`.
- **Antes de desplegar, probar apibara con una clave real (plan de pago):** alta por enlace (Copart e
  IAAI), VIN y lote; Refrescar; fotos (hasta 24); cuota agotada (429) y clave rechazada (401); y comparar
  la respuesta real con `e2e/fixtures/apibara` por si la API cambió.
- **Siembra:** un permiso nuevo en una base viva lleva su `insert … on conflict` y la concesión al dueño
  en la misma migración; `origenes_lead` y `tipos_seguimiento` sólo están en `seed.sql`. El **código de
  país** va en Empresa › Región.

## Deuda aceptada y pendiente de decidir

- **Por decidir:** dominancia sobre la persona; vencimiento de la invitación (`otp_expiry`); fotos de una
  subasta en segundo plano; rango de un campo numérico; separar `leads.campos.gestionar`.
- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`; `marca` y
  `avatares` borran con `quitarSiHuerfano()`. `cambiar_fase` acepta `p_fase_esperada` nulo.
- `vehiculos.papelera.purgar` gobierna también la de cotizaciones, sin versión ni purga automática (Fase 4).
  `web.solicitar_asesor` no valida el vehículo; `cotizacion_marcar_final` vincula sin
  mirar la papelera. `limpieza_el` corre con los derechos de la base. Despublicar no revoca la URL de una foto.
- «Ver como» acota la interfaz, no las filas que entrega la base (en leads fuerza «míos»). `storage-gc` y
  `apibara` (Deno) no entran en lint ni typecheck. Falta probar fotos en iPhone. `tipo_acceso =
'adoptado'` quedó sin uso. La ficha de leads parte los números con el
  código del lead: un extra de otro país se ve sin partir.
- Dos mensajes de RPC hablan de vos: `cambiar_fase` y la fórmula. Sin interfaz: `demora_dias_default`,
  `lead_dormido_meses`, el logo oscuro, `push_web`, `web_publica`, `ajustes_web.origenes_visibles`,
  `fases.publica_web`, el `icono` y el orden de los orígenes. Sin enforcement: `equipo.usuarios.ver`,
  `equipo.roles.ver`, `tablero.metricas.ver`, `datos.exportar.todo`, `notificaciones.push`, `logistica.pagos.confirmar`.
