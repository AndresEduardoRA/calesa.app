# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-16
**Fase actual:** 3 — Leads, **partes 8a a 9d-3 hechas** (CSV; el país del teléfono; el primer seguimiento del alta; los modales con su URL; el drawer con tres pestañas y las listas de un lead a escala; el recorrido de la IA con dos cuentas). Faltan la 9e, la 9f, la 9g y el **cierre de la fase** (`docs/PLAN.md`).

## Funcionando

- Verdes: lint, typecheck, test, `db:probar` (matrices y cinturón), `db:lint`, `db:carreras` (dos conexiones
  reales, sin `sleep`), `mapa.sh`, build y el e2e completo (números en `docs/BITACORA.md`). Fases 0 a 2 completas
  y las partes 1 a 9d-3 de la Fase 3 (último e2e completo, el de la 9d-2: 569 en verde, 0 fallos, 5 saltos, 22,9 min; ver BITACORA). **e2e:** `pnpm test:e2e:completo` resetea y corre todo (pide
  `npx supabase functions serve`); nivel 1: `pnpm test:e2e --project=escritorio <spec>`. Los specs reusan la sesión (`entrarConSesion`, `{ fresco: true }` si el test cambia a la persona). Apibara sin clave: lo grabado.
- **Leads (1 a 8b):** alta, campos, listado, ficha (datos, teléfonos, seguimientos, recordatorios, vehículos,
  oportunidades y **«Portal»**: el acceso del cliente), marcas, «Quién lo tiene», papelera, embudos con kanban;
  `web.portal_*` sin oráculo y con la sesión que se corta. Toda RPC que recibe un lead cae en una de tres
  clases (`docs/DECISIONES.md`, 2026-10-15) y el cinturón de `db:probar` falla si una nueva no está auditada.
  **CSV:** exportar la cartera (≤ 5.000, 5 por hora), importar (≤ 500 filas, lotes de 50, reglas del alta) y
  **deshacer** lo importado que sigue intacto durante 24 h (clase X; «Tus importaciones recientes» en `/leads/importar`).
  **País del teléfono (9a):** tabla estática de 242 países, sólo con `import()`, sin SQL. **Alta (9b):** el paso 2 es opcional (`Ctrl/Cmd+S` guarda siempre), con `CamposDelSeguimiento` compartido con la ficha, «Próximo contacto» plegado y `_lead_crear` con el detalle como documento. **Modales (9c, 9d):** teléfono extra, recordatorio, portal y seguimiento son `<Modal>` con su `?panel=` sobre `ModalDeFormulario` de `shared`, en la ficha, el drawer y el «⋯» de la fila (`?panel=…&para=<id>`). **9d-2:** el drawer tiene «Resumen», «Seguimientos» y «Recordatorios» (`?pestana=`), cada una con su `import()` y su lectura al elegirse; las listas de un lead van de a 20 hasta 500 (aviso e «Ir a una fecha»), «Recargar» cuesta ≤ 2 pedidos, «Completados» no cuenta ni lee hasta abrirse y el aviso de vencidos dice «más de 20». Regla: `.claude/rules/escala.md`; superficies y presupuestos: `docs/RENDIMIENTO.md`; volumen: `e2e/leads-rapido-volumen.spec.ts` y `db:medir` (planes asertados). **9d-3:** el recorrido con la dueña y una asesora con el rol `asesor` de la semilla queda en `e2e/leads-recorrido*.spec.ts` (capturas para mirar con `E2E_CAPTURAS=e2e-capturas/9d-3`); se arreglaron la ficha más ancha que el celular con cinco secciones, «Ver más» sin red, el aviso que salía con un modal sucio, el portal que cerraba con la clave escrita, los avisos en inglés para el lector y el deshacer duplicado de la importación (`docs/BITACORA.md`). **Orígenes y vehículos** completos. Código: `docs/MAPA.md`.

## Siguiente: Fase 3 — Leads (`docs/PLAN.md`), lo que falta

En orden, una por sesión (detalle en `docs/PLAN.md` › Fase 3):

1. **9e:** auditoría de escala de toda la app con guardas mecánicas (los conteos que se muestran: `contarLeads()`, `vehiculos_vinculados`; el JS que el shell carga por `@/modules/leads`: 509,6 KB en frío, igual en `/perfil`).
2. **9f:** orígenes configurables y numeración (por creador y global, con visibilidad configurable del número global).
3. **9g:** ítems por página configurables en toda la app.
4. **Cierre:** «Mover a…» con motivo y los `Confirmar` sin URL; fijar el presupuesto de `/leads` (66,0 KB de documento, 509,6 KB de JS en frío); la ventana de pérdida de lo tecleado en el panel de tipos de cambio; fechas de las entradas del repo (la del sistema); el Nivel 2 sólo en escritorio con `--project` en `test:e2e:completo`; los 105 s de `beforeAll`/`afterAll`; presupuestos, recorte de la ficha, índice de DECISIONES y tabla de criterios. **Del recorrido (9d-3):** el nombre del listado se corta a ~15 caracteres en 1280 con el panel de filtros; sin red, abrir un modal diferido que nunca se pidió tumba la pantalla al `error.tsx` (9 `diferidos.tsx`); paginar el listado sin red cae a la página del navegador; con un modal abierto el lector no alcanza los avisos (`aria-hidden` de Base UI); en el celular la barra de secciones esconde «Portal» sin pista; los avisos con la tipografía del sistema; «Deshecha» con dos estilos. Abierto: lotes de 50 (100 cabe). Un e2e que falla deja sus artefactos en `e2e-fallos/`.

## Pendientes que se arrastran

- **Ficha:** «Datos» 43,4 de 44 KB, «Oportunidades» 42,1–42,3 con tres, «Portal» 33,7 (9c y 9d: los modales diferidos no los movieron); si se pasa, se recortan las
  props. **Embudos:** plantilla de etapas por empresa; tablero de equipo (Fase 9, `tablero.metricas.ver`).
  **Portal:** plantilla del texto por empresa; `ajustes_web.direccion_publica` sin pantalla; la Fase 8 hace
  `api/portal/*`, la cookie con `otorgado_en`, el límite por IP y el ingreso según el contrato de
  `docs/DECISIONES.md` (2026-10-16). `logging.serverFunctions` quedó apagado.
- **Lead sin dueño y con compartidos** (tras una baja): lo rescata la supervisión transfiriéndolo con `p_dueno_esperado` nulo. **Fase 7:** la notificación al compartir o transferir.
- **Fase 4:** la cotización final como ancla de la limpieza; desvincular con cotización final;
  `cotizacion_marcar_final` toma vehículo → lead (al revés que vincular: posible deadlock); campos del
  lead en la tarjeta o el PDF. **Fase 6:** mover de fase y publicar sin mover la versión de la ficha; la
  papelera manual no mira `documentos`. **Fases 7 y 8:** el CTA «Escribirle por chat»; la notificación
  de la limpieza; el buscador de leads, sin los privados; el atajo `?` sin lista. **Recordatorios:**
  `recordatorios_notificar()` existe sin cron y su `ruta` nombra el lead aunque su dueño ya no lo vea.
- **9e:** el listado con 5 a 10 mil (filtrar por un atributo ~0,06 ms por fila; el aviso de tachados ocultos cuenta lo mismo otra vez; si pesa, una función que recorta una vez por consulta). **Fase 9:** Actividad leerá el diff recortado. Sin remoto,
  `.github/` no corrió: su job e2e no sirve las funciones edge ni usa `test:e2e:completo`. **Shards del completo** (con remoto): cada uno con su pila Supabase, `db:reset`, `E2E_PORT`, `NEXT_DIST_DIR`, funciones edge y `--shard=i/n`; una base por shard, no `workers` (filas únicas de empresa y «equipo vacío»).

## Lista para la nube (una persona)

- Proyecto y `supabase link`; primer `db push --include-seed`; plantillas de correo; `Site URL`; SMTP;
  Google; `supabase functions deploy storage-gc` y `apibara`, y `select public.storage_gc_programar(
'https://<ref>.supabase.co/functions/v1/storage-gc');` (sin eso la purga deja los archivos).
- **El día del primer `db push`** `db:base` se congela (la migración base ya estará aplicada) y los cambios
  son sólo migraciones: cambia la regla de `docs/DECISIONES.md` (2026-10-11) y el chequeo de `db:probar`.
- **Jobs** (`limpieza-automatica`, `apibara-consultas-purgar`, `papelera-purgar`, `importaciones-vinculos-purgar`): comprobar en `cron.job`
  (`pg_cron` corre en UTC) y que el runtime inyecta `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`.
- **Antes de desplegar, probar apibara con una clave real (plan de pago):** alta por enlace (Copart e
  IAAI), VIN y lote; Refrescar; fotos (hasta 24); cuota agotada (429) y clave rechazada (401); y comparar
  la respuesta real con `e2e/fixtures/apibara` por si la API cambió.
- **Siembra:** un permiso nuevo en una base viva lleva su `insert … on conflict` y la concesión al dueño
  en la misma migración; `origenes_lead` y `tipos_seguimiento` sólo están en `seed.sql`. El **código de
  país** va en Empresa › Región.

## Deuda aceptada y pendiente de decidir

- **Por decidir:** dominancia sobre la persona; vencimiento de la invitación (`otp_expiry`); fotos de una subasta en segundo plano; rango de un campo numérico; separar `leads.campos.gestionar`.
- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`; `marca` y `avatares` borran con `quitarSiHuerfano()`. `cambiar_fase` acepta `p_fase_esperada` nulo.
- `vehiculos.papelera.purgar` gobierna también la de cotizaciones, sin versión ni purga automática (Fase 4). `web.solicitar_asesor` no valida el vehículo; `cotizacion_marcar_final` vincula sin mirar la papelera. `limpieza_el` corre con los derechos de la base. Despublicar no revoca la URL de una foto.
- «Ver como» acota la interfaz, no las filas que entrega la base (en leads fuerza «míos»). `storage-gc` y `apibara` (Deno) no entran en lint ni typecheck. Falta probar fotos en iPhone. `tipo_acceso = 'adoptado'` quedó sin uso.
- Dos mensajes de RPC hablan de vos: `cambiar_fase` y la fórmula. Sin interfaz: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web`, `web_publica`, `ajustes_web.origenes_visibles`, `fases.publica_web`, el `icono` y el orden de los orígenes. Sin enforcement: `equipo.usuarios.ver`, `equipo.roles.ver`, `tablero.metricas.ver`, `datos.exportar.todo`, `notificaciones.push`, `logistica.pagos.confirmar`.
