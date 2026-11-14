# Rendimiento

Los topes vigentes de cada superficie que crece, su índice y el comando que los mide. La regla está en `.claude/rules/escala.md`. Un
presupuesto no se sube para hacer pasar una medición: se explica o se arregla (salvo la regla del 5 % de `.claude/rules/e2e.md`).

## Cómo se mide

- `pnpm db:medir` (`scripts/medir-listado.mjs`, títulos en `scripts/mediciones.mjs`): cada `supabase/tests/medir-*.sql` en una transacción
  que se revierte, como `authenticated`, plan genérico (`force_generic_plan`), `EXPLAIN (ANALYZE, BUFFERS)`, mediana de 5 de 7 corridas.
  Asserta la forma del plan (índice nombrado, sin recorrer la tabla, lo que se descarta).
- `pnpm db:sembrar-volumen` (62.000 leads; `-- --leads 200000` → 212.000; 10.000 vehículos, 200.000 seguimientos, 20.000 recordatorios,
  8.000 oportunidades en una etapa; 50.000 cotizaciones de `sembrar-cotizaciones.sql`: la dueña 2/5, Ana 1/25, 70 % con vehículo, 2 %
  finales, 2 % en la papelera; termina en `vacuum analyze`) y `pnpm db:medir:volumen` (`medir-escala.sql`, como la dueña con «todos» y Ana
  con «propios», y las demás `medir-*.sql` de volumen). Después, `pnpm db:reset`. Una medición que siembra en su transacción hace `vacuum`
  antes y después; una que siembra sus cotizaciones vacía la tabla en su transacción (`truncate … cascade`, que el `rollback` devuelve).
- Buffers por relación (`pg_stat_get_xact_blocks_fetched`), no totales: el autovacuum de las tablas de permisos mueve los totales.
- Pantalla: `E2E_VOLUMEN=1 pnpm test:e2e` (volumen por SQL en `e2e/soporte/sql.ts`): pedidos, bytes de la primera respuesta y nodos del
  DOM, sin cronómetros.
- JS en frío: suma de los `.js` (gzip, sin caché) que nombra el documento (`e2e/soporte/js-en-frio.ts`); topes en
  `e2e/soporte/presupuestos.ts`, los hace cumplir `e2e/presupuesto-js.spec.ts`.
- Jobs y baja con transacciones de verdad: `medir-jobs.sql`, `medir-bajas.sql` (pausa el cron `equipo-bajas`). `pnpm db:carreras` para los
  candados.
- Los ms de lo que escribe a disco dependen de un `fsync` lento: un job o una baja que cae sin que cambie el trabajo (lotes, buffers) se
  anota con su carga; no se afloja el tope ni se reintenta a ciegas.

## Seguimientos de un lead

Sección «Seguimientos» de la ficha y pestaña del drawer.

- 20 por «Ver más», hasta 500 (`TAMANO_DE_VER_MAS`, `TOPE_DE_LO_CARGADO`); más allá, «Ir a una fecha». Lectura: `lead_seguimientos()`.
- Índices: `seguimientos_lead_autor_idx (lead_id, usuario_id, ocurrido_en desc, id desc)` y `seguimientos_lead_publicos_idx` (parcial).
  «Recargar» tras un conflicto: primera página + `lead_seguimiento(p_lead, p_id)` por la PK, ≤ 2 pedidos.
- Primera respuesta < 24 KB con 20 ítems; 1 pedido al abrir la pestaña (+ los tipos activos). Nodos del drawer ≤ 2.500 tras 5 «Ver más» y
  ≤ 9.000 en el tope (`content-visibility: auto` por ítem).
- Mide: `db:medir` (página 1 y 501); `e2e/leads-rapido-volumen.spec.ts`.

## Recordatorios de un lead

- 20 por «Ver más», hasta 500 por lista; «Completados» no se lee hasta abrirse. Lectura: `lead_recordatorios(p_lead, p_completados, …)`;
  por id, `recordatorios_vista`.
- Índices (parciales): `recordatorios_lead_pendientes_idx (usuario_id, lead_id, recordar_en, id)` y
  `recordatorios_lead_completados_idx (usuario_id, lead_id, completado_en desc, id desc)`.
- Primera respuesta < 14 KB con 20 ítems; 1 pedido al abrir, 1 más al abrir «Completados»; «Recargar»: 1 pedido, por su id.
- Aviso de vencidos de la ficha: `lead_ficha()` cuenta hasta 21 por `recordatorios_lead_pendientes_idx` («más de 20»).
- Mide: `db:medir` (sin filas descartadas en ningún plan); `e2e/leads-rapido-volumen.spec.ts`.

## Agenda

- Calendario: `agenda_rango()`, un pedido por rango de ≤ 45 días; tope 200 por clase (`limit 201`, `hay_mas` y `tope`). Índices:
  `eventos_inicio_idx`, `tareas_responsable_idx` (mías) o `tareas_vence_idx` (con `agenda.ver_todo`), `recordatorios_usuario_idx` y
  `vehiculos_cierre_subasta_idx` origen por origen. `eventos: leer` en línea: `tiene_permiso` como InitPlan y el destinatario por PK.
- Límite sin assert: en un origen con «propios» la RLS descarta adentro los vehículos ajenos, acotado a las subastas vivas del origen en el
  rango (el mismo de `medir-panel-cierre-subasta.sql`).
- «Sin fecha»: `agenda_tareas_sin_fecha()`, 20 por «Ver más» (máx. 50), `tareas_sin_fecha_idx`, cursor `(creado_en, id)`.
- «¿A quién?»: `agenda_quienes_reciben()`, ≥ 3 letras o dígitos, tope 20, sobre `perfiles`.
- Sin volumen ni `medir-*.sql`: `eventos` y `tareas` no son tablas que crecen.

## Embarques y contenedores

- `/logistica/embarques`: `transporte_grupos()` (definer) por cursor opaco (el id de una fila de la clave siguiente), de a
  `TAMANO_DE_PAGINA_POR_DEFECTO` (`_acotar_pagina(p_tope, 50, 100)`), sin `?por=`, total ni `offset`. Índices `transportes_booking_idx` y
  `transportes_contenedor_idx` (parciales). Recorre **a lo sumo 2.000 filas**: si no llena la página devuelve `cortada` y la pantalla
  ofrece «Seguir buscando». Registrada en `scripts/guardas/areas-b/paginas-en-la-base.ts`.
- El resumen lee `transporte_grupo()` (≤ 200 unidades, una llamada, sin N+1: por eso no trae «días en la fase»); navieras y puertos, una vez
  por pedido (`cache()`, `.limit(201)`).
- **Sin medir con volumen** (lo fija `supabase/tests/areas/transporte/grupo.sql`): sin presupuesto de tiempo. Sin presupuesto de JS: el
  drawer sólo se monta con la clave en la URL y los huecos van con `diferido()`.

## Gastos y pagos

- `/logistica/gastos`: `gastos_listar()` y `pagos_listar()` (definer, filtran por origen y alcance), cursor `(fecha desc, id desc)`, de a
  `TAMANO_DE_PAGINA_POR_DEFECTO` + 1, sin `?por=`, total ni `offset`. Índices `gastos_fecha_idx` y `pagos_fecha_idx` (parciales
  `where eliminado_en is null`). Registradas en `scripts/guardas/areas-c/paginas-en-la-base.ts`.
- **Sin medir con volumen** (abierto 6-5, `docs/PENDIENTES.md`: falta `medir-gastos-pagos-listar.sql`). Con «propios» el `en_cartera` por
  fila puede descartar al profundizar; hasta medirlo no hay presupuesto.
- Listas de un hueco de la unidad (`gastos_vehiculo_idx`, `pagos_vehiculo_idx`): tope 50 + 1 con aviso y «Ver todos en Gastos».

## Chat

- Lista: `chat_conversaciones()`, 20 por «Ver más» (máx. 50), cursor `(ultimo_mensaje_en, id)`. Parte de
  `conversaciones_miembros_usuario_idx` y lee `conversaciones` por PK: ordena sólo las de quien mira. No leídos: ≤ 100 entradas de
  `mensajes_hilo_idx` por fila (≤ 2.000 por página de 20; ≤ 5.000 con 50).
- Total: `chat_no_leidos()`, se detiene a los 100; peor caso, una sonda por conversación de quien mira más 100 entradas.
- Sin volumen ni `medir-*.sql` (`conversaciones` y `mensajes` no son tablas que crecen). El plan genérico de plpgsql no se midió.
- Límite sin assert: una conversación que recibe un mensaje mientras se pagina sube y no reaparece abajo; la relectura de la cabeza la trae.

## Hilo

- Se lee en el navegador: páginas de 21 (`tamano + 1`) por `mensajes_hilo_idx (conversacion_id, creado_en desc, id desc)`, sin `offset` ni
  `count`; tope 500 con `<AvisoDeTope>` e `<IrAUnaFecha>`. La señal relee 20 filas (una por ráfaga, debounce de 250 ms).
- La cita de un mensaje respondido se lee **aparte**, por `mensajes_pkey` (≤ 21 ids, sólo si la página trae respuestas): el embed
  `responde` no sirve sobre una relación a sí misma (PostgREST la rechaza o la devuelve como arreglo).
- `chat_leer`, `mensaje_editar` y `mensaje_eliminar` escriben una fila. DOM: ≤ 500 burbujas; el menú «⋯» sólo existe abierto.
- Límite sin assert: editar o borrar un mensaje más viejo que los 20 más nuevos no se refresca en la **otra** sesión hasta recargar o «Ver
  anteriores». Sin volumen ni `medir-*.sql`.

## Inicio: la bandeja

- Tres lecturas en el servidor, cada una `limit 6` tras el `<Suspense>` de su bloque: `recordatorios_vista` por
  `recordatorios_usuario_idx`; `leads_cartera_vista` por `leads_asesores_listado_idx` (cuesta la cartera de quien mira); `perfiles` por
  `perfiles_vigentes_orden_idx`. Ninguna recorre `leads`.
- `turnos-web`: dos lecturas `limit 6` de `solicitudes_contacto_web` (`solicitudes_contacto_web_usuario_id_idx`; las `asignada`, por
  `solicitudes_web_asesor_abiertas_idx`) y, si hay vehículos, una de `web.vehiculos` por ids. La tarjeta sólo se monta con turnos; el panel
  de vincular va con `diferido()`.
- `repuestos-por-mover` y `esperas-repuestos`: una lectura `limit 6` cada uno sobre `repuestos_items` (`repuestos_items_fase_id_idx`, orden
  `fase_desde`; sin índice propio: abierto 8-13c, `docs/PENDIENTES.md`), con fase, proyecto y título embebidos. Server Components.

## Inventario de escala

Tope = lo que se dibuja o se lee de una vez; un número que se muestra es siempre acotado (`limit tope + 1`, «más de N»). Presupuesto = lo
que asserta `pnpm db:medir:volumen` o el e2e. Mide `medir-escala.sql` salvo que se diga otro.

### Leads

- Listado: 100 por cursor (`MAXIMO_DE_PAGINA_DE_LEADS`), `leads_listado_idx`; 30 ms página 1, 150 ms página profunda (100 por cursor). La
  policy se estima con `_lead_visible_para()` sobre `leads.cartera`.
- Quien tiene pocos leads («la chica»): «míos» por `leads_cartera_vista` e
  `leads_asesores_listado_idx (usuario_id, lead_creado_en desc, lead_id desc) include (tipo_acceso, revocado_en) where revocado_en is null`
  (lo elige `fuenteDelListado()`); página 1 hasta 30 ms, cursor hasta 150, hasta 3.000 descartes, con 62.000 y 212.000. Un «todos» con
  cartera corta (`leads_cartera_corta()`, hasta 5.000) también va por la cartera; la dueña no. Límite: 500 leads en la papelera descartan
  ~530 en la página 1 (≤ 30 ms).
- Último seguimiento y próximo recordatorio del listado (`medir-leads-ultimo-contacto.sql`): dos columnas de `leads_vista` (subconsultas `limit 1` por
  `seguimientos_lead_fecha_idx`, igualdad con `ultimo_seguimiento_en`, y `recordatorios_lead_pendientes_idx`), la página de 101 filas de la dueña y de Ana, «todos»
  y «míos»: ≤ 150 ms (31 a 56 ms con la siembra, 11 a 13 ms sin las columnas), sin `Seq Scan` de `seguimientos` ni `recordatorios`, ≤ 40 buffers por fila
  (8 a 18) y +~250 B crudos por fila en la respuesta. Con 40 seguimientos y 3 recordatorios pendientes por lead el costo por fila no cambia (la
  medición lo asserta: ±25 %); con el índice por fecha caído, la guarda falla. Con la RLS de `seguimientos` cada fila paga una vez `puede_lead()` (~14 buffers).
- «Míos» del panel del cliente por lo más reciente (`leerMios`; `medir-cartera-reciente.sql`): `leads_cartera_vista`,
  `order by reciente_en desc, id desc`, `TAMANO_DE_VER_MAS + 1` filas, sin `Sort` ni `Seq Scan`, por
  `leads_asesores_reciente_idx (usuario_id, lead_reciente_en desc, lead_id desc) where revocado_en is null`. Topes: 30 ms y 1.500
  buffers; la pestaña de una clase, 2.500 buffers (camina ~7 leads por cada uno que muestra). **Límite aceptado:** quien tiene miles de
  leads y ninguno de una clase recorre su cartera entera en esa pestaña, tope 400 ms con 80.000 en su cartera (el panel muestra el esqueleto); crece con la cartera de quien mira. Escribir: cada
  seguimiento reescribe las filas de cartera de su lead (tope 250 buffers); el relleno de la migración ≤ 60 s.
- Panel del cliente de la hoja (`e2e/cotizar-panel-del-cliente.spec.ts`): la barra va fuera de `[data-hoja]` y no importa el panel ni
  `<Badge>`. Con 20 filas, en «Todos»: ≤ 159 nodos y ≤ 5.282 B la primera respuesta de «míos». Cambiar de pestaña o de página no pide al
  servidor (`history: 'replace'`). El catálogo es `leads_catalogos()` entero, leído una vez al abrir (memoria de 60 s); en «Todos» y en la
  búsqueda va a la vez que la primera página y la pestaña de una clase lo espera. La búsqueda es la del listado por candidatos (la mide
  `busqueda-volumen.sql`). El «+» va en el panel diferido; el alta es la del shell.
- Nombre y filtros en dos pasos: `leads_candidatos(p_filtros)` (definer, `{ ids, completa, hasta }`, 300 candidatos; etapa W de hasta
  4.000 filas por el orden del listado, 10.000 en un campo público de quien ve «todos»; etapa I por
  `leads_busqueda_idx gin (cartera, nombre gin_trgm_ops, atributos_publicos jsonb_path_ops) where eliminado_en is null and cartera <> '{}'`,
  con `fastupdate = on` y `gin_pending_list_limit = 256`) y `leads_vista_por_ids(p_leads)` (invocador, SQL, `stable`, sin `strict`: se
  inlinea). No depende de N;
  `condicionesDeLaPagina()` no repite nombre, campo público ni etiqueta en el paso 2.
- Presupuestos de esos dos pasos, iguales con 62.000 y 212.000: nombre escaso ≤ 50 ms; texto y rango de un campo público ≤ 50 ms y 45.000
  buffers; campo privado, tachados ocultos y primer pedido de la exportación ≤ 100 ms y 40.000 buffers (paso 1 ≤ 80, paso 2 ≤ 40); conteo
  entero de la exportación con un valor denso ≤ 800 ms y 400.000 buffers. Berta lee ≤ 40 bloques del heap buscando un nombre ajeno (sin
  oráculo). Una etiqueta propia entra por `leads_candidatos()` (clave `etiquetas`, `leads_etiquetas_etiqueta_id_idx`), ≤ 100 ms.
- Mínimo del nombre: 3 letras o dígitos seguidos (`[[:alnum:]]{3}` en `_leads_candidatos_indexable()`; JS `[\p{L}\p{Nd}]{3}`); con 1 o 2,
  0 pedidos (`e2e/leads-listado-busqueda-minima.spec.ts`). Límite: una etiqueta puesta sólo en los 40.000 leads más viejos de la dueña
  cuesta ~138 ms con 212.000.
- Huella: `busqueda-leads.sql` (`db:probar`) y `busqueda-volumen.sql` (`db:medir:volumen`) comparan filas enteras por md5 entre la ruta de
  la vista y la de los candidatos.
- Filtros por origen y tipo: `leads_listado_idx` (uno raro, por `leads_origen_lead_id_idx` y `leads_tipo_lead_id_idx`); 100 ms; sin índice
  compuesto. Más de ~1.000.000 de leads: volver a medir con `db:sembrar-volumen -- --leads 1000000`.
- Atributo público (`atributos_publicos`), favoritos, tachados, etiqueta (unión por PK con las marcas): 100 ms cada uno. Aviso de tachados
  ocultos: «más de 50» (`contarLeadsHasta`, `leads_tachados_pkey`), 100 ms.
- Buscar `#n`: `leads_ids_del_numero(p_numero, p_todos)`, hasta 100 ids; `leads_numeros_globales_numero_key` y
  `leads_numeros_propios_creador_idx (creado_por, numero)`; ≤ 5 ms, sin `Seq Scan`. Los números del listado son subconsultas escalares;
  `tiene_permiso('leads.numero_global.ver')` se evalúa una vez por consulta. Alta (número propio): `leads_contadores` por PK, 80 ms.
- Ficha: «más de 100 vehículos» (`vehiculos_lead_id_idx`), 80 ms. Oportunidades: cursor de a 20 (máx. 100), las abiertas primero, por
  `oportunidades_lead_abiertas_idx` y `oportunidades_lead_cerradas_idx`; bloques que no crecen con la profundidad
  (`medir-lead-oportunidades.sql`); `medir-escala.sql` mide la primera de 20 (150 ms). La pantalla pide 10 en el servidor y 20 por «Ver más».
- Papelera de leads: 5 lotes por cursor (`LOTES_POR_PAGINA`), de cada uno los primeros 20 (`PRIMEROS_DEL_LOTE`) y «Mostrar los N» (≤ 200);
  `en_papelera` exacto ≤ 200; `lotes_papelera_tipo_idx`; 400 ms.
- «Quién lo tiene» (`leads_asesores`, 50 ms), candidatos de cartera (`limit 500`, 50 ms), `leads_catalogos()` (30 ms). Etiquetas: 50 por
  persona, «En N leads» hasta 1.001 (`leads_etiquetas_etiqueta_id_idx`), 300 ms.
- Selectores del alta (desde el navegador al abrir el drawer: `lead_alta_contexto` y `leads_campos`): los tres catálogos al tope de 100
  (`_origenes_lead_tope()`, `_tipos_lead_tope()`, `_tipos_seguimiento_tope()`), sin `clave` ni `icono`; 2 pedidos, < 40 KB sin comprimir con
  100 + 100 + 100 (`e2e/leads-alta-contexto.spec.ts`); ningún documento los lleva.
- Configuración de orígenes, tipos de lead y de seguimiento: 100 cada uno («N de 100»); «¿algún lead lo usa?» es un `exists` por rango
  (`>= x and <= x`) sobre `leads_origen_lead_id_idx`, `leads_tipo_lead_id_idx`, `seguimientos_tipo_idx`; 100 ms la lista, 5 ms eliminar.
- Iconos del catálogo (24 claves): las filas dibujan un símbolo compartido (`<use href>`); el shell y el alta no importan el catálogo.
- Exportar: lotes de 500, hasta 5.000, 5 por hora; hasta 5.001 ids de a 1.000 (`leads_listado_idx`), 100 ms; «Descargamos N» exacto.
- Importar: «Tus importaciones recientes» 20 de las últimas 24 h (`importaciones_leads`, 300 ms); vista previa 500 filas, 50 por página;
  lotes de 50, 500 por archivo (`FILAS_POR_LOTE`). `medir-importacion-volumen.sql`: 500 filas ≤ 2 s con 62.000 y 212.000 leads, y la razón
  del tiempo por fila entre los dos volúmenes de `actividad` en 0,8–1,2 (falla si crece con `actividad`). La oportunidad base de cada fila
  (con su historial y su actividad) suma ~20 %: 500 filas ~1,3 s. `_lead_crear` busca la adopción
  sólo si el alta trae `adoptar` (`actividad_intento_adopcion_idx`); la importación lo rechaza. `medir-importacion.sql` (`db:medir`, base
  recién reseteada; `seed.sql` analiza).
- No se agrega un índice, trigger o columna a `leads` sin medir alta (80 ms), 500 filas importadas (≤ 2 s) y la baja de 200.000.

### Vehículos, orígenes, equipo y empresa

- Inventario: 50 por cursor (máx. 100, `MAXIMO_DE_PAGINA_DE_VEHICULOS`), `vehiculos_origen_listado_idx`; 20 ms página, 100 / 150 ms
  búsqueda y limpieza.
- Lectura con 50.000 y 250.000 (`medir-vehiculos-lectura.sql`): la dueña, Pía y Beto («propios», `en_cartera` una vez por fila) ≤ 10 ms y
  300 buffers (Beto ≤ 1.000); `puede_vehiculo()` ≤ 5 ms; razón con 250.000 ≤ máx(1,5 × t; t + 3 ms), buffers ≤ 1,2 × + 20. Sin assert:
  quien tiene vehículos sin lead recorre el origen entero por PostgREST; por eso quien ve «propios» lee por `vehiculos_inventario()`.
- **El inventario por rutas** (`vehiculos_inventario()`; `medir-vehiculos-inventario.sql`, `-forma`, `-guarda`, `-costo-fijo`), plpgsql
  invocadora que planea su texto en cada llamada: R1 el origen (`vehiculos_origen_listado_idx`; quien ve «todos» o tiene más de 5.000 leads
  en su cartera), R2 lo creado (`vehiculos_creador_idx`), R3 la cartera corta (un lateral por lead sobre `vehiculos_lead_id_idx`), cada una
  con su `limit`; `limpieza_el` sobre lo leído por R1 o R2, y R3 relee sólo las de la página. Topes: Pía, la chica y Beto ≤ 10 ms (Pía con
  un atributo sin coincidencias ≤ 20), Vera (cartera de 5.000) ≤ 40; bloques del índice de la ruta: Pía ≤ 12, la chica ≤ 6, Beto ≤ 20;
  bloques de `vehiculos` con 250.000 ≤ 1,2 × + 20. El tiempo no se compara entre volúmenes (el ruido lo confundía con crecimiento).
  Límites sin assert: más de 5.000 en la cartera recorre el origen (R1); R3 crece con los vehículos de la cartera, no con N; un filtro sin
  coincidencias recorre todo lo que la persona creó; 500 alternativas sin coincidencias ≈ 144 ms (el tope de la validación);
  `por_limpiar` llama a `limpieza_el(v)` por candidata; el costo fijo de una llamada no crece con las concesiones.
  Cada página pide además la condición por defecto (`situacion_fuera_de` sin las no ganadas, medida en «Pía · por defecto» y «Beto · por
  defecto»: misma ruta e índice). **Límite aceptado:** con la limpieza apagada y muchas no ganadas, una página lee también las no ganadas
  intercaladas: crece con su densidad, no con N; el filtro de situación (T14) tendrá su ruta por `vehiculos_situacion_idx`.
- **Panel de revisiones de una guardada** (`e2e/cotizar-guardada-revisiones.spec.ts`): `cotizacion_revisiones` por cursor (`p_antes`), de a
  `TAMANO_DE_VER_MAS` hasta `TOPE_DE_LO_CARGADO`, por `cotizaciones_revisiones_cotizacion_idx (cotizacion_id, id desc)`. Primera página con
  20: ≤ 254 nodos y ≤ 12.503 B (≈ 12 nodos por fila: dos `<Monto>` por revisión; no envolver cada cambio en otro `<span>`). El tope de 500
  se prueba en Vitest. «Ir a una fecha»: un pedido por salto con `p_hasta`; viaja en el chunk diferido del panel.
  `medir-cotizacion-revisiones-fecha.sql`: el ancla por
  `cotizaciones_revisiones_cotizacion_creado_idx (cotizacion_id, creado_en desc, id desc)` y la página por
  `cotizaciones_revisiones_cotizacion_idx`; con 5.000 revisiones, los mismos bloques a cualquier profundidad e igual
  con 500 que con 5.000 (sin el índice, la guarda cae). Supone que el id crece con `creado_en` por cotización (abierto 4-95,
  `docs/PENDIENTES.md`).
- Panel del vehículo (desde el navegador): páginas de `TAMANO_DE_VER_MAS` + 1 por cursor, con 50.000 y 250.000, como la dueña, Pía y Beto:
  «Últ. cotización» por `vehiculos_cotizado_idx` (`medir-panel-ultima-cotizacion.sql`) y «Cierre subasta» por `vehiculos_cierre_subasta_idx`
  sobre la columna generada `cierre_subasta_en` (`medir-panel-cierre-subasta.sql`; el margen de 24 h es otro `>=`), ≤ 10 ms y 300 buffers
  (Beto ≤ 1.000), sin `Sort`. Historial de un vehículo con 5.000 cotizaciones por `cotizaciones_vehiculo_creado_idx`
  (`medir-historial-del-vehiculo.sql`), ≤ 10 ms y 300 buffers. Razón con 250.000 ≤ máx(1,5 × t; t + 3 ms), buffers ≤ 1,2 × + 20.
  Límites sin assert: el plan genérico de la profunda de un vehículo muy cotizado a veces ordena las suyas (crece con las cotizaciones del
  vehículo, no con N); la chica recorre lo cotizado y lo vivo de su origen; el historial de quien ve «propios» recorre las del vehículo; la
  portada embebida de cada fila (≤ 21 lecturas por `vehiculos_portada_unica`) no tiene medición SQL.
- En pantalla (`e2e/cotizar-panel-del-vehiculo.spec.ts`): con 20 tarjetas sin foto y el buscador, ≤ 299 nodos y ≤ 4.900 B la primera
  respuesta (con portada, cada fila suma su ruta de miniatura); cambiar de pestaña o de página no pide al servidor. La búsqueda tiene la
  forma de la del inventario (título, VIN o lote por `vehiculos_origen_listado_idx`, de a 21, desde 3 letras o números, pausa de 300 ms) y
  sólo ella pide `creado_en` (en las pestañas pasaría el tope de bytes). Sin medir, como en el inventario: el `lote` en el `or` y el texto que
  no coincide (recorre el origen).
- El alta se pide al abrirse y lee el layout activo desde el navegador (`useLayoutActivo()`): la diferencia del documento entre la dueña y
  un rol sin `vehiculos.crear` ≤ 40.000 B sin comprimir (`e2e/cotizar-panel-crear-vehiculo.spec.ts`; con el layout en el documento eran
  69.098).
- Historial en pantalla: al desplegarlo, de a 21 por cursor, con el autor embebido (una lectura por PK de `perfiles` por fila, ≤ 21: límite
  sin assert) y «Ver más» hasta 500, que ofrece «Ver todas en Cotizaciones» (`/cotizaciones?vehiculo=`).
  `e2e/cotizar-historial-del-vehiculo.spec.ts`:
  ≤ 5.250 B la primera respuesta y ≤ 65 nodos. «Cotizado (n)» es la misma consulta con `select('id')`, en paralelo con la hoja.
- Pestaña «Cotizaciones» de `/vehiculos/[id]`: la misma lectura, al abrir la pestaña (nunca con la ficha), código con `diferido()` en su
  `diferidos.tsx`. `e2e/vehiculos-cotizaciones.spec.ts`: ≤ 5.250 B, ≤ 65 nodos con 20 y ≤ 1.576 con 500; la 25.ª respuesta pesa lo que la
  1.ª. Con «propios» hereda el límite del historial.
- El dato del vehículo en el panel (sin spec propio): con un vehículo en la URL, la página lee además el layout del origen en el
  `Promise.all` y, tras `leerVehiculo`, `editablesDe` (sin consulta con «todos» o lo que creó); el documento suma `paraElegir` (≈ 150 B) y
  `seEligen`. Con un elegido y un dato, una `cotizacion_tabla` por tabla distinta, en paralelo, recordada 5 min por hoja abierta y tabla
  (`memoriaDeLectura()`). Se dibujan ≤ 50 opciones (`TOPE_DE_OPCIONES`) con «Buscar en las opciones» y `<AvisoDeTope>`.
- Papelera de vehículos: como la de leads, 200 ms. «Más de 1.000» archivos por borrar (`cola_gc_storage_edad_idx`, 50 ms). Galería: 24 por
  vehículo (`vehiculos_imagenes_hash_unico`). Vínculos e interesados: 50 / 100, «Mostrando los 50 vínculos / 100 interesados más
  recientes.» (`vehiculos_vinculos_vehiculo_idx`); en el lead, los tres bloques de «Vehículos» 100 / 100 / 50. «Agregar vehículo»: 20, lee
  21, 300 ms.
- Papelera de cotizaciones: como la de vehículos, `lotes_papelera_tipo_idx`, 200 ms. «Le queda alguna en la papelera» es una sonda por lote
  (`cotizaciones_lote_papelera_idx`, `limit 1`): un `exists` haría un semi join que lee entero ese índice. `medir-escala.sql`, con 500
  lotes más de la dueña: por el índice, sin recorrer `lotes_papelera` ni `cotizaciones`; quien no tiene la clave descarta los lotes ajenos
  (tope 600; crece con ellos, no con la página).
- `/cotizaciones/papelera` (`e2e/cotizaciones-papelera.spec.ts`): una página (`tamano + 1`) y «Mostrar los N» un lote al pedirlo. JS en frío
  ≤ 440 KB. Página 1 con 5 × 20: ≤ 3.000 nodos y ≤ 475.000 B de documento, igual (± 2 %) con lotes de 21 que
  de 200 (≈ 1 KB por botón «Purgar»: las clases de `Button`). Purgar no lee nada: una llamada por confirmación y relee una página.
- Orígenes: resumen y categorías con uso, 100 / 50 ms (exento, administración). Tipos de cambio: historial de 30 («Mostrando los 30
  cambios más recientes.»).
- Requisitos de una fase (administración): `requisito_impacto()` y `flujo_fuera_de_regla()` recorren ≤ 1.000 unidades por fase sin orden
  (`vehiculos_fase_id_idx` / `repuestos_items_fase_id_idx`; más es una muestra, `revisadas` lo dice) y cortan en `tope + 1` (50, máx. 100).
  Presupuesto previo 500 ms; peor caso de `flujo_fuera_de_regla`: fases con bloqueantes × 1.000 `evaluar_requisitos`. Exento de medición.
- Equipo: 100 por nombre (`TOPE_DEL_EQUIPO`; `equipo_lista()` lee 101) en dos etapas: W las primeras 2.000 del estado (perezosa), I el
  trigram. Índices `perfiles_vigentes_orden_idx`, `perfiles_estado_orden_idx`, `perfiles_busqueda_idx` (GIN trigram; `unaccent` declarada
  `immutable`, `reindex` si cambia). Sin texto ≤ 150 buffers la consulta; < 3.500 nodos (`e2e/equipo-tope.spec.ts`). Mínimo 3 letras o
  dígitos, 0 pedidos con 1 o 2 (`e2e/equipo-busqueda-minima.spec.ts`); `lista-equipo.tsx` no llama a `setParametros` si `q` no cambia.
  Miniatura de 96 px. `medir-equipo.sql` (10.000 y 100.000 personas; no crece más de 1,5 veces, piso 60 buffers).
- Roles: `roles_personas()` hasta 1.001 por rol («más de 1.000 personas»), `usuarios_roles_rol_idx`, ≤ 150 buffers. La matriz no pagina:
  72 filas de catálogo + hasta 18 de niveles (`_niveles_tope()` = 10; 9 que generan permisos × 2) (`e2e/roles-niveles.spec.ts`).

### Baja de una persona

- Vista previa: hasta 1.001 («más de 1.000»), `leads_asesores_usuario_vigente_idx`, ≤ 300 ms (`_bajas_en_curso()` envuelta en
  `(select …)::uuid[]`, un InitPlan).
- Baja: lotes de 5.000 por cursor (ids del índice y candado por clave, separados). `medir-bajas.sql` con 200.000 leads de una persona: la
  llamada ≤ 4.000 ms; el job `equipo-bajas` corta cada corrida a 1,5 s: ≤ 12 corridas, ≤ 20.000 ms en total, la más larga ≤ 3.000 ms. Lo
  que cuenta es el trabajo (≈ 40 lotes).
- Por qué cuesta: `cartera` está en `leads_busqueda_idx`, así que ningún update de la baja es HOT (11 btree en `leads`). Sacarla del GIN rompe
  la búsqueda (Berta leería leads ajenos): descartado. Con lotes de 1.000 la guarda de corridas cae.

### Jobs (100.000 filas por purgar)

Mide `medir-jobs.sql`; los presupuestos son 10 a 30 veces lo típico.

- `papelera-purgar`: 50 lotes por corrida entre leads, vehículos y cotizaciones, cada hora. Con 100.000 cotizaciones en 500 lotes (una
  revisión y un adjunto cada una), una corrida purga 10.000 ≤ 25.000 ms; selección por `lotes_papelera_pendientes_idx` y una sonda por lote;
  refcount de cada adjunto por `cotizaciones_adjuntos_ruta_idx` (sin él, un `Seq Scan` por ruta).
- `limpieza-automatica`: mueve 200 y revisa 1.000 más.
- `situacion-al-cerrar` (cada 10 min): hasta 500 por corrida, de a un origen de subasta, por `vehiculos_situacion_idx (origen_id, situacion,
creado_en desc, id desc) where eliminado_en is null and situacion <> 'fase'`; recorre las «En subasta» del origen: crece con las subastas
  vivas, no con N. 500 de 1.000 vencidas entre 2.000 ≤ 2.000 ms.
- **Límite aceptado:** marcar o desmarcar «Es la subasta» recalcula la situación de los vehículos de esa fase y de los «sin fase» del origen
  (también la papelera) en la transacción de `fase_guardar`: lineal, en una acción de configuración poco frecuente.
- `importaciones-vinculos-purgar`, `importaciones-filas-purgar` y `apibara-consultas-purgar`: lotes de 10.000, 10 por corrida.
- `importaciones-continuar` (cada 2 min): 5 importaciones totales detenidas y 50 sin avance en 24 h por corrida
  (`importaciones_en_curso_idx`).
- `importar-csv` (función edge): ≤ 45 s por invocación, lotes de 50 (`FILAS_POR_LOTE`); archivo normalizado ≤ 10 MB y 20.000 filas, leído
  entero en cada invocación. Con ≈ 8 s cada 500 leads, 20.000 filas son 7 u 8 invocaciones y más de 20 min (el job despierta la siguiente a
  los 2 min sin avance).
- Convertir en el navegador: 20.000 leads pasan el presupuesto de ≤ 1 s, así que la pantalla convierte por tramos de 500
  (`convertir-por-tramos.ts`) cediendo el hilo, con «Preparando el archivo…» y el avance; idéntico a una pasada (`preparadorDeFilas`). La
  vista previa convierte 500 (`FILAS_DE_VISTA_PREVIA`).
- Importaciones: «Ver más» de 20 hasta 500 por `importaciones_lista_propia_idx` o `importaciones_lista_idx` (parciales: el filtro
  `archivo_ruta is not null` va siempre); sondeo cada 5 s por PK con ≤ 21 ids, sólo con alguna en curso y la pestaña a la vista; el informe
  de rechazadas, ≤ 20 × 1.000 por PK y sólo al «Descargar». No es una tabla que crece.
- `storage-gc`: 100 por ronda, 5 rondas; 2.000 huérfanos encolados por pasada; el barrido lleva un cursor por bucket (`cola_gc_barrido`):
  10.000 objetos por pasada, 5 pasadas por corrida.
- `leads-campos-privacidad` (lotes de 5.000, hasta 10 por corrida) y `equipo-bajas` (arriba).

## Ítems por página: qué lista lo admite y su máximo

Elige 10, 25, 50 o 100 (`listas.por_pagina`, `?por=`); cada lista declara su máximo. Un máximo se gana midiendo: `db:medir:volumen` y
`e2e/listas-por-pagina-volumen.spec.ts` (bytes, nodos, página profunda). En el celular el selector va arriba de la lista y se dibuja una sola
vista (`UnaSolaVista`, según el `user-agent`).

- Listado de leads: 100; ≤ 3.600 nodos en escritorio y 3.500 en celular con filas sin seguimientos (`leads-escala.spec.ts` con `?por=100`; 2.200 con 50); con
  las 100 filas llenas de la siembra, ≤ 4.650 nodos y 55.500 B gz (`listas-por-pagina-volumen.spec.ts`). Las columnas «Último seguimiento» y «Recordatorio» pesan
  ~7 nodos y ~70 B comprimidos por fila llena (100 filas llenas: 4.035 nodos y 52,9 KB en escritorio; 4.419 nodos y 51,2 KB en celular). Es lo que el listado
  dice de cada lead; bajarlo pide un máximo de 50 por página.
- Inventario de vehículos: 100; ≤ 6.000 nodos y 63.000 B gz (60.000 + 5 % por la columna «Cotización aprobada»: 61,2 KB con 100 filas; las props son un `Record` por id de vehículo con la ruta, el monto y la moneda de su aprobada).
- Listado de cotizaciones: 100; ≤ 2.200 nodos (2.130 + 3 % por la insignia «Aprobada»: 2.147 en escritorio) y 39.500 B gz.
- Sin selector: las papeleras (5 lotes × 20), «Ver más» de seguimientos y recordatorios, la columna del kanban (50, tope 500,
  `TAMANO_DE_COLUMNA`) y las listas de tope fijo.
- En la base cada RPC con tamaño acota con `_acotar_pagina(pedido, por_defecto, máximo)`: seguimientos y recordatorios 20 hasta 50;
  papeleras 6 hasta 51; `embudo_tablero` 50 hasta 100 por columna y 500 hasta 1.000 de total; `embudo_etapa_pagina` 50 hasta 100;
  `vehiculos_inventario()` 100 hasta 100. El listado de leads y el inventario de quien ve «todos» van por PostgREST (`max_rows` = 1.000).
  `escala.sql` llama las RPC con 100000, 51, 30, 0, -1 y nulo.

## Kanban y oportunidades

- Tablero: 6 columnas × 50, «500+» por columna, `oportunidades_tablero_idx`; la policy de `oportunidades` pregunta por fila
  `_lead_vivo_en_mi_cartera(lead_id)`. Presupuestos: tablero 800 ms, «Ver más» 500 ms, buscar 700 / 200 ms; primera página de una columna,
  «Ver más» y total acotado ≤ 25 ms (la guarda asserta `oportunidades_tablero_idx`, sin recorrer `oportunidades`, ≤ 200 descartes).
- Nodos con una columna en el tope (500 tarjetas): ≤ 10.250 en escritorio y 6.000 en el celular (`leads-escala.spec.ts`); el «⋯» de cada
  tarjeta cuesta exactamente 3 nodos (`<use>` a un símbolo de `src/shared/ui/lista/simbolos-de-lista.tsx`; `e2e/mas-acciones-icono.spec.ts`).
  El servidor dibuja una sola distribución según el ancho de la petición.
- Oportunidades de la ficha: 10 en el servidor y «Ver más» de a `TAMANO_DE_VER_MAS` desde el navegador hasta `TOPE_DE_LO_CARGADO`, con
  aviso y «Buscarlas en tu embudo». Documento de la ficha ≤ 66 KB sobre `/perfil` con la sección abierta, igual con 10 o con 1.000; cada
  «Ver más» pesa lo mismo a cualquier profundidad; nodos lineales hasta 500 (`e2e/leads-oportunidades-ver-todas.spec.ts`).

## Vistos

- `vistos_de(módulo, tipo, ids)`: una llamada por página dibujada, ≤ 100 ids por la PK `(usuario, módulo, tipo, referencia_id)` y el último
  por `vistos_ultimo_idx (usuario, módulo, tipo, visto_en desc)` con `limit 1`: no crece con lo que la persona vio. `visto_registrar`, un upsert
  por PK. `vistos_purgar()` cada hora, por persona por `vistos_usuario_visto_idx`, lotes de 5.000 y 50.000 por corrida (el orden rota con la hora); techo de 20.000 filas por persona, contado con tope sólo al insertar.

## Alertas y bandeja de logística

- `logistica_bandeja(5)` (definer, máx. 20): demoradas = por par (origen visible, fase que alerta) un rango de `vehiculos_cadena_idx` con
  `limit 50` (cuesta los pares, no las unidades). Trabados: hasta 50 `evaluar_requisitos`. Por aprobar: `documentos_por_revisar_idx` con
  `limit n + 1`. Sin volumen: rangos acotados de índices ya medidos.
- `alertas_demora()` (job `alertas-demora`, cada hora en el minuto 12): ≤ 2.000 unidades por corrida, de a 200 por cursor
  `(fase_desde, id)` sobre `vehiculos_cadena_idx`; destinatarios una vez por origen. «Ya avisé», «abierto» y el cierre al mover
  (`trg_alertas_cerrar_al_mover`, también en un `cambiar_fase_lote` de 200) van por
  `notificaciones_referencia_idx (referencia_id, tipo, usuario_id, creado_en desc)`. **Límite aceptado:** con más de 2.000 demoradas, las
  nuevas esperan a que se muevan las viejas.
- `documentos_vencimientos()` (job `documentos-vencimientos`, 11:15 UTC): ≤ 2.000 por corrida por `documentos_vencen_idx (vence_el)`; el
  cursor `(vence_el, id)` agrega un ordenamiento parcial e incluye los documentos de repuestos (cuentan para el tope).
- Cada aviso nuevo pasa por `trg_notificaciones_push`: con `push_web`, un `pg_net` por insert; reabrir no empuja.
- Inicio: los tres bloques de logística leen `bandejaLogistica(TOPE_DE_BLOQUE)` con `cache()`: una llamada por pantalla. Cada bloque dice
  «N» o «más de 5» (`cantidadAcotada`).

## La cadena de logística

- `/logistica`: `logistica_cadena()` trae la primera página de cada columna (`TAMANO_DE_COLUMNA`), «Ver más» de a 50 por
  `verMasDeLaColumna` hasta `TOPE_DE_LO_CARGADO` con `<AvisoDeTope>`; el número de la columna es `50+`, nunca un total. Índice
  `vehiculos_cadena_idx (origen_id, fase_id, fase_desde, id) where eliminado_en is null and situacion <> 'no_ganada'` (parcial: cada consulta
  lleva el literal). Nada por tarjeta: los atributos del nombre van en tandas de 100 ids por PK.
  Sin foto ni «⋯». Una sola vista en el DOM.
- JS en frío ≤ 410 KB (al borde: 401,0).
- Sin volumen de interfaz: `e2e/logistica-cadena.spec.ts` prueba «Ver más» con 51, no mide nodos.
- Lote de mover: selección y lotes ≤ 200 (`TOPE_DEL_LOTE`) en **una llamada** (`previsualizar_cambio_fase_lote`, `cambiar_fase_lote`). Los
  destinos de la fase son configuración (`TOPE_DE_DESTINOS`). «Unidades de un grupo (lote)»: `vehiculos` con `transportes!inner` por
  `transportes_contenedor_idx` / `transportes_booking_idx`, `limit 201`. Las casillas y el contexto van en el JS de `/logistica`; la barra,
  el drawer y el hueco del grupo, con `diferido()`.
- Panel de la unidad, «Notas»: `notas` por `notas_vehiculo_vivas_idx (vehiculo_id, creado_en desc, id desc) where eliminado_en is null`,
  `limit 21`, cursor `(creado_en, id)` e «Ir a una fecha»; hasta 500 con `<AvisoDeTope>`; autor y fase embebidos. Sin `medir-*.sql`.
- «Historial»: `historial_fases` por `historial_fases_vehiculo_idx (vehiculo_id, creado_en)` hacia atrás, igual cursor, tope y salto; fases
  y persona embebidas. Se lee al abrir su bloque; código con `diferido()`.

## Buscador

Cada sección por su RPC, de a `_acotar_pagina(p_tamano, 5, 20)` + 1, con el mínimo de `MINIMO_DE_BUSQUEDA` en la base
(`_buscador_interpretar()`).

- Leads (`buscador_leads()`): la ventana de `leads_candidatos()` con sólo el texto + `leads_ids_del_numero()` (≤ 100) + una pasada de
  `leads_vista_por_ids()`; corta en 21.
- Vehículos (`buscador_vehiculos()`): una ruta por origen visible por `vehiculos_origen_listado_idx`, ≤ 21 por origen. **Límite sin
  assert:** un texto que no coincide recorre los vehículos vivos de cada origen visible.
- Cotizaciones (`buscador_cotizaciones()`, definer; `medir-buscador.sql`, 50.000 y 250.000): el número por `cotizaciones_numero_key`; el
  título por `cotizaciones_titulo_trgm`, ≤ 1.000 candidatas de los orígenes que se ven, más las propias por `cotizaciones_creador_idx`
  (≤ 21) **sólo donde se tiene «propios» sin «todos»**; la policy sobre ellas por PK. Presupuestos: número 10 ms, título raro 20, común 150
  la dueña y 300 con «propios»; ningún recorrido entero. **Límites declarados:** con un título común el GIN y la PK de la policy crecen con
  las coincidencias (≤ 1.000 × su profundidad); la ruta de las propias crece con las propias; con «todos» y más de 1.000 coincidencias, las
  propias no tienen prioridad (se llega por `#número` o afinando). Con el plan a medida (las 5 primeras llamadas de una sesión) un título muy
  común va por un `Seq Scan` con `limit 1000`: se queda así. Guarda: sin `cotizaciones_titulo_trgm`, lo raro recorre la tabla.
- Últimos abiertos (`leerUltimosAbiertos()`): ≤ 16 visitas propias por `visitados_usuario_visto_idx` y hasta tres lecturas en paralelo por
  PK (≤ 16 ids cada una, bajo la RLS de cada tabla); se muestran 8.
- Una búsqueda: hasta 4 pedidos en paralelo, cada uno ≤ 6 filas; espera de 250 ms entre teclas.
- La paleta: 5 filas por sección, 8 «Últimos abiertos», 8 acciones con texto (sin texto, las ~25 del menú). El shell suma el botón,
  `useAtajo` y las acciones como props; `cmdk`, `command.tsx`, la paleta y sus hooks van tras `diferido()` hasta pulsar «Buscar».
- `visitados`: ≤ 50 por persona (`visita_registrar()` recorta), por la PK y `visitados_usuario_visto_idx (usuario_id, visto_en desc)`.

## Repuestos

- `repuestos_proyectos_listar()` (definer): cursor sobre `repuestos_proyectos_numero_key` (`numero desc`), de a 50 (máx. 100) + 1; con y
  sin cursor son dos consultas. Las cuentas de ítems leen ≤ 201 vivos por `repuestos_items_proyecto_id_idx`; el título del vehículo
  (`puede_vehiculo`) sólo para la página. El texto (≥ 3 o sólo dígitos) es filtro: si no coincide recorre los proyectos vivos (**límite sin
  assert**).
- `repuestos_stock_listar()` (definer): cursor `(en_stock_desde, id)` sobre
  `repuestos_items_en_stock_idx (en_stock_desde desc, id desc) where en_stock_desde is not null and eliminado_en is null`, de a 50
  (máx. 100) + 1; ids primero, luego proyecto y título de la página. Sin presupuesto
  medido. La dibuja `/repuestos?vista=stock` (`TAMANO_DE_PAGINA_POR_DEFECTO`); el buscador de «Reasignar»
  lee una página de `TAMANO_DE_VER_MAS` abiertos. Movimientos de un ítem (`leerMovimientosDeItem`): por
  `repuestos_stock_movimientos_item_id_idx`, `id desc` como cursor, de a `TAMANO_DE_VER_MAS` + 1, tope `TOPE_DE_LO_CARGADO` con
  `<AvisoDeTope>`. **Excepción a «siempre hay un camino a lo antiguo»:** más allá de 500 movimientos no hay «Ir a una fecha» (un ítem tiene
  pocos).
- Compras de un proyecto: PostgREST bajo `repuestos.costos.ver`, por `repuestos_compras_proyecto_id_idx`, tope 200 + 1 con `<AvisoDeTope>`
  (sin camino: compras no crece), orden `fecha desc, creado_en desc, id desc`; sólo al abrir la pestaña. `repuestos_proyecto_margen()`
  (definer), un proyecto, `sin_precio` hasta 201.
- `repuestos_pendientes_de_vehiculo()` (definer): un proyecto vivo por vehículo (`repuestos_proyecto_por_vehiculo`), sus ítems por
  `repuestos_items_proyecto_id_idx` y las esperas de las fases siguientes; de a 50 (máx. 200) + 1. El hueco «Repuestos» del panel del
  vehículo la llama al abrir el bloque y otra vez si cambia la fase.
- Cadena (`/repuestos?vista=cadena`): PostgREST bajo `repuestos.ver`, **una consulta por fase** (≤ 30) más «Sin fase», en paralelo, cada una
  `limit 51` (`TAMANO_DE_COLUMNA + 1`) por `repuestos_items_fase_id_idx`, orden `(fase_desde, id)`; «Ver más» de a 50 por cursor hasta
  `TOPE_DE_LO_CARGADO`. Abierto 8-13c (`docs/PENDIENTES.md`): un índice `(fase_id, fase_desde, id)` si llega a
  miles. `/repuestos` no tiene presupuesto de JS.
- Sin volumen ni `EXPLAIN` en `db:medir:volumen`: `repuestos_*` no están entre las tablas que crecen de `escala.md`.
- Imágenes de un ítem: `limit 9` por `repuestos_items_imagenes_item_id_idx`, sólo al abrir el panel; el trigger cuenta con `limit 8` bajo
  un candado por ítem. **Excepción a «nunca el original»:** sin miniatura y con `unoptimized`, cada imagen baja el WebP de ≤ 1600 px (≤ 8
  por panel abierto).
- Pestaña «Repuestos» de la ficha del vehículo: `proyectoDe` es `limit 1` por `repuestos_proyecto_por_vehiculo` y el recuento por fase lee
  ≤ 201 ítems; sólo al abrir la pestaña; Server Components.
- Catálogos de Configuración: 4 × `limit 201` por PostgREST (decenas de filas); tope 200 con `<AvisoDeTope>`.
- Configuración del cotizador (`/configuracion/repuestos`, «Cotizador»): tres lecturas en paralelo bajo `repuestos.cotizar` o
  `repuestos.configurar`: la configuración por su PK (`order by id desc`, la primera es la vigente) tope 20 + 1, los tramos por
  `repuestos_tramos_logistica_moneda_idx` y las cajas por `repuestos_cajas_moneda_monto_key`, tope 200 + 1 cada una, con `<AvisoDeTope>`.
  Los modales se piden al abrirse (`diferido()`).
- Cotizaciones de un proyecto (`/repuestos/[id]`, «Cotizaciones»): `limit 51` por `repuestos_cotizaciones_proyecto_id_idx`, tope 50 con
  `<AvisoDeTope>`, sólo con la pestaña abierta; la hoja lee la cotización por PK (`limit 1`) y sus líneas por
  `repuestos_cotizaciones_lineas_cotizacion_id_idx` (tope 200 de la base). En borrador lee además los ítems del proyecto (`limit 201`, tope
  200 por `armarHoja`); el total en vivo es O(líneas) ≤ 200 por cambio, con líneas y `XCell` en `memo` y callbacks estables.

## Tablero: métricas

- `tablero_leads()` y `tablero_cotizaciones()` (definer): agregados de un período ≤ 366 días (zona de la empresa). `tablero_leads` recorre
  `leads_listado_idx` por `creado_en` y `leads_cliente_desde_idx` (parcial) por `cliente_desde`; el dueño por `leads_asesores_dueno_unico`
  (una sonda por lead). `tablero_cotizaciones` recorre `cotizaciones_listado_idx`. Costo lineal en lo **del período**; rankings cortados con
  `row_number()` (10 orígenes, 20 personas), un día por fecha con `generate_series`.
- `tablero_margen()` y `tablero_cola_web()` (definer), con la misma regla: `tablero_margen` recorre `pagos_tablero_confirmado_idx` (parcial:
  confirmados vivos de vehículo, por `confirmado_en`) y `pagos_fecha_idx`; por vehículo, una sonda en `pagos_vehiculo_idx`,
  `gastos_vehiculo_idx` y `cotizaciones_final_por_vehiculo`; 10 orígenes. `tablero_cola_web` recorre
  `solicitudes_contacto_web_asignada_idx` y corta en 20 personas.
- Sin presupuesto medido ni `EXPLAIN` en `db:medir:volumen` (no es una lista); si hace falta, se mide con 366 días.
- `/tablero`: ≤ 4 RPC por carga (una por grupo, compartidas con `cache()`); Server Components sin JS propio salvo el «Reintentar» de un
  widget caído y los `<Link>`; sin presupuesto de JS. «Personalizar» es un `<Drawer>` diferido; guardar es un `upsert` de `tablero.widgets`
  y `router.refresh()`. Las gráficas son HTML y SVG de servidor (90 días: 180 rectángulos y 90 filas), sin consulta nueva.

## JS en frío (con gzip, lo que el documento nombra)

- Topes (`PRESUPUESTO_DE_JS_EN_KB`): `/leads` 530, `/perfil` 440, `/vehiculos` 500, `/cotizaciones` 380, `/cotizaciones/nuevo` 460 (con la
  subasta, `?origen=`), `/cotizaciones/[id]` 460, `/logistica` 410; `/cotizaciones/papelera` 440 (en su spec). Al borde:
  `/cotizaciones/[id]` 452,2 de 460 (las acciones de los avisos lo pasaron de 452: regla del 5 %) y `/cotizaciones/nuevo`, que llegó a 459,0 de 460 (abierto 4-73, `docs/PENDIENTES.md`); lo que se sume
  a la hoja va con `diferido()`. La guardada viaja con la hoja nueva (`hoja-de-cotizar.tsx` importa su guardado).
- El `index.ts` de un módulo no exporta componentes: cada pantalla trae los suyos por `pantallas/<pantalla>.ts`. `scripts/guardas/barriles.test.ts`
  falla, con el camino, si un `index.ts` llega a un `'use client'`.
- **Trampa:** con `loading.tsx` importando el barril de pantallas, sumar un Client Component a la página baja dos chunks casi iguales (el de
  `loading` y el de `page`); por eso existe `pantallas/esqueleto-de-hoja.ts`. Se ve comparando `entryJSFiles` de
  `page_client-reference-manifest.js` entre dos builds.
- react-pdf no llega al navegador, pero estar en el grafo del servidor suma ≈ 0,45 KB al runtime de Turbopack de **todas** las rutas.
- El marco (shell): en el JS de toda pantalla viajan el botón de la burbuja del chat, `usePathname`, el store del contador y
  `useAlDescansar`; el cliente de Supabase, la suscripción, el panel, la lista, el hilo y el redactor van con `diferido()`. La campana: su
  contador con Realtime y su popover van con `diferido()` (sin eso `/cotizaciones` subía ≈ 66 KB). Una `chat_no_leidos` al montar y otra por
  ráfaga de señales (≥ 250 ms).
- Documento de `/perfil` (HTML con el payload RSC, sin comprimir) ≤ 119 KB (113,3 con «Vistos») (`PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB`), igual con la
  semilla y con 100 + 100 + 100 catálogos (± 1 KB): lo paga toda pantalla del marco. Las ≈ 30 acciones de la paleta viajan como props del
  hueco del buscador; el formulario de «Tu ficha en la web» se monta y se pide con `diferido()` al abrirla. El layout `(app)` no manda
  catálogos al alta: `<AltaDeLead>` no recibe nada y los lee del navegador (`infra/contexto-de-alta.client.ts`, memoria de 60 s en
  `shared/lib/memoria-de-lectura.ts`).
- Ficha, «Datos»: ≤ 43 KB sobre `/perfil` (`PRESUPUESTO_DE_LA_FICHA_EN_KB`), igual con la semilla y con 100 orígenes + 100 tipos (manda los
  campos activos y el origen y tipo del lead; el panel de edición los lee al abrirse, `leerCatalogosDeEdicion()`); `e2e/leads-ficha.spec.ts`.
  «Cotizar» de la cabecera suma, para quien tiene `cotizaciones.crear`, `getOrigenes()` (una por request) y ~90 B.
- «Nuevo lead» es un solo drawer: 1 montaje y 1 entrada animada por apertura, 1 lectura de cada pedido (`e2e/leads-alta-un-drawer.spec.ts`).

## Cotizador (fórmula, diseño, cotizaciones)

Salvo que se diga otro, mide `pnpm db:medir` en la base de la semilla; el tope en ms es la mayor mediana de varias corridas × 3, el de
buffers lo medido + 20 %, y la razón entre tamaños la fija el pedido. Cada guarda se prueba con una versión mala (cuadrática, N+1) que debe
fallar.

- `validar_formula()` (`medir-validar-formula.sql`): 200 nodos ≤ 26 ms, 2.000 ≤ 245 ms, razón ≤ 12. Es `STABLE`; la llamada va sobre una
  subconsulta con `offset 0` (inmutable, caería en Planning Time). 0 buffers.
- `evaluar_formula()` (`medir-evaluar-formula.sql`): 200 nodos ≤ 16 ms, 2.000 ≤ 136 ms, razón ≤ 12; con una columna comprimida ≤ 1,5 veces
  los literales. Una guarda de texto en `evaluar-formula.sql` (`db:probar`) cae si la pasada lee un argumento dentro de un bucle.
- `validar_diseno()` (`medir-validar-diseno.sql`): 206 ítems ≤ 15 ms, 2.018 ≤ 136 ms, razón ≤ 12; columna externa 206 ítems ≤ 320 buffers
  y 2.018 ≤ 2.000; comprimida ≤ 1,5 veces los literales. El sintético no lleva `texto` (no recorre `_diseno_auxiliares()`). Límite: el
  ayudante es lineal en filas × largo del texto; con textos de ≈ 2.000 caracteres pasa el tope desde unas 450 filas (no es guarda). Ninguna
  consulta del bucle nombra un arreglo: lo recibiría entero (cuadrático).
- Guardar y publicar (`medir-publicar.sql`; se repite sin `db:reset` porque compacta `formulas` antes de medir): `formula_publicar` 206
  ítems ≤ 55 ms y 2.350 buffers, 2.018 ≤ 550 ms y 20.600 (razón ≤ 12); `formula_guardar_borrador` ≤ 36 / 320 ms; `_compilar_visibilidad`
  ≤ 4 / 27 ms y, con columna externa, ≤ 60 / 375 buffers. El ⚙ (`formula_cambiar_constante`) ≤ 60 / 550 ms y 2.300 / 5.200 buffers;
  `formula_revertir` ≤ 60 / 600 ms y 2.700 / 21.600 (razón ≤ 12); sus topes de ms pasan los de publicar sólo por el redondeo. Sondas de uso
  (`_tono_en_uso`, `_nivel_uso`; `formulas_tonos_idx`, `formulas_niveles_idx`, CTE `materialized` para que el GIN conduzca): se miden por
  crecimiento: 1.800 versiones más suman ≤ 1/3 de lo que suma una copia sin GIN.
- `_nodos_visibles()` (`medir-nodos-visibles.sql`): razón 255 → 2.487 nodos ≤ 12 en ms y buffers, ≤ 20 ms con 2.487, nunca más que leer la
  fila de la fórmula + 600 buffers. `_nivel_uso()` ≤ 100 ms con 2.000 versiones; `niveles_con_uso()` (9 niveles en uso) ≤ 60 ms con 200
  versiones por nivel y ≤ 400 con 2.000.
- `cotizacion_hoja()` (`medir-cotizacion-hoja.sql`): la hoja de las capturas como dueña ≤ 16 KB y 10 ms; `planilla_usa` ≤ 10 ms; con una
  tabla viva de 1.000 filas ≤ 12 bloques de `tablas_referencia_filas`; sintética de 255 nodos ≤ 25 ms, de 2.487 ≤ 300 ms, razón ≤ 15; 0
  bloques de `cotizaciones` y `cotizaciones_revisiones`. Lineal (~140 B por ítem); un diseño publicable tiene ≤ 40 ítems
  (`demasiados_items`). Las sintéticas no producen ningún dato: el camino con `dato_del_vehiculo` lo miden las semillas. Una sola función SQL
  por nodo: cada llamada de más a una función con `set search_path` cuesta ~50 µs por ítem.
- La hoja de una guardada (`cotizacion_hoja_guardada()`, `medir-cotizacion-hoja-guardada.sql`, 50.000 y 250.000): ≤ 20 ms y 1.500
  buffers, razón de `cotizacion_crear`, 0 recorridos de `cotizaciones` (la anterior por la clave; la nueva viva por `cotizacion_padre_id`),
  `_nodos_visibles` 2 veces y la respuesta de la dueña ≤ 14.230 B. Guarda: buscar la nueva sin índice recorre.
- Versiones de la fórmula (Configuración › Cotización › «Fórmula», `infra/formula/consulta-de-versiones.ts`): PostgREST de a 20 + 1 por
  cursor sobre `formulas_origen_id_version_key` (`version < n`), sin `definicion`, `params`, `diseno` ni `visibilidad`; tope 500 con «Ir a la
  versión»; la primera página, el estado (`limit 2`) y los autores en el servidor, «Ver más» desde el navegador. El plan lo fija
  `supabase/tests/areas/formula/versiones-por-cursor.sql` (`db:probar`); falta su `EXPLAIN` en `db:medir:volumen`.
  `configuracion-cotizacion-formula.spec.ts`: «Ver más» ≤ 4.650 B, ≤ 127 nodos con 20 y ≤ 3.151 con 500. Publicar, revertir y descartar: un
  pedido por envío y relee la primera página.
- Pestaña «Tarjeta» (`e2e/configuracion-cotizacion-tarjeta-volumen.spec.ts`): con 500 miembros, primer HTML ≤ 163.700 B y ≤ 5.000 nodos con
  «Filas» abierto. La tarjeta, el editor, el modal de publicar y el diálogo de descartar van por `diferido()`; «Buscar fila» filtra en el
  navegador. `pantallas/tarjeta-plantilla.ts` no entra a la hoja. `/configuracion/cotizacion` no tiene presupuesto de JS.
- Editor de la fórmula (`e2e/configuracion-cotizacion-formula-editor.spec.ts`): abrirlo lee una fila de `formulas` por `formulas_pkey`
  (`definicion`, `params`, `estado`, `diseno`, `nota`): con 600 filas ≤ 80.900 B; dibuja hasta 500 (`TOPE_DE_LO_CARGADO`) con
  `<AvisoDeTope>` y «Buscar fila»: ≤ 6.300 nodos. El estado de las filas es O(filas × nodos), una vez por fórmula de trabajo; filtrar y
  tipear no lo recalculan (`use-editor-de-la-formula.soporte.escala.test.ts`: razón cuadrática ≤ 1,1). Abierto: con miles de filas pasa de
  1 s. Compilar y validar corren en el navegador al aplicar, con `diferido()`. La vista previa: 3 pedidos en el caso habitual (tipos de
  cambio; tablas vivas; sus filas por páginas de `limit(1000)` por `tablas_referencia_filas_tabla_orden_idx`) y ≤ 8, constantes
  (`e2e/configuracion-cotizacion-formula-editor-previa-volumen.spec.ts`); una tabla se lee si tiene ≤ 999 filas, ≤ 40 tablas. Falta el
  `EXPLAIN` de esas lecturas en `db:medir:volumen`. Guardar el borrador es una Server Action sin releer; un diseño de 2.000 ítems queda bajo
  el tope de 1 MB de una Server Action (`use-guardar-borrador.soporte.test.ts`).
- `cotizacion_tabla()` (`medir-cotizacion-hoja.sql`): la tabla viva de 1.000 filas (`tablas_referencia_filas_tabla_orden_idx`,
  `limit 1001`), con y sin la hoja abierta, ≤ 25 ms; la firma suma ≤ 3 ms; ≤ 569.352 B la dueña (filas enteras) y ≤ 52.752 la asesora (año y
  factor); 0 bloques de `cotizaciones`. Quien configura recibe las filas sin recortar a `columnas`.
- `cotizacion_evaluar()` (`medir-evaluar.sql`, `db:medir:volumen`, 200 llamadas, 50.000 y 250.000): fórmula del seed mediana ≤ 10 ms y
  p95 ≤ 20; sintética de 200 nodos con 4 tablas de 1.000 filas p95 ≤ 50; p95 con 250.000 sobre 50.000 ≤ 1,5. Guarda de ARMAR:
  ≤ `1,2 × (páginas + 4 × (hojas + 3) + costo fijo)` buffers, y los bloques de `tablas_referencia(_filas)` ≤ los de la consulta de referencia + 2
  (cae con una tabla de más o N+1). La firma de la hoja abierta suma ≤ 3 ms.
- `cotizacion_crear()` (`medir-cotizacion-crear.sql`) y `cotizacion_guardar()` (`medir-cotizacion-guardar.sql`), 50.000 y 250.000:
  ≤ 20 ms y 1.500 buffers (la sintética de guardar ≤ 60 ms y 1.000); 0 recorridos de `cotizaciones` o sus revisiones
  (`pg_stat_xact_user_tables.seq_scan`); razón ≤ máx(1,5 × t; t + 3 ms), buffers ≤ 1,2 × + 20. Cada corrida reescribe la fila del vehículo
  (`cotizado_en`; `pg_temp.sin_cotizar()` antes de cada `explain`, delta de `n_tup_upd` exigido). El intento se busca por `cotizacion_id`.
  **Cotizar encima** (`cotizacion_encima()`, `medir-cotizacion-encima.sql`): los mismos topes, una anterior distinta por corrida. Guarda: la
  nueva viva buscada sin `cotizaciones_encima_unica` recorre.
- Lectura (`medir-cotizaciones-lectura.sql`): páginas de 101 por cursor `(creado_en desc, id desc)` como la dueña, Ana y la chica ≤ 10 ms
  y 300 buffers; `cotizacion_leer` ≤ 10 ms; `cotizacion_revisiones` (500, con autor y etiquetas sobre la página recortada) ≤ 12 ms; razón
  con 250.000 ≤ máx(1,5 × t; t + 3 ms); 0 llamadas por fila a `en_cartera`, `alcance_de` y `mis_leads()`, ≤ 2 a `origenes_con_alcance`;
  `cotizacion_leer` y `cotizacion_revisiones` piden `alcance_de` 1 vez, también con «propios».
- El listado `/cotizaciones` (`medir-cotizaciones-listado.sql`, `db:medir:volumen`): `cotizaciones_listado()`, invocadora, páginas de
  `MAXIMO_DE_PAGINA_DE_COTIZACIONES` + 1, la 1, una profunda y una hacia atrás, con 50.000 y 250.000. Rutas: «todos» por
  `cotizaciones_listado_idx` (con la final, `cotizaciones_finales_idx`) o, con el origen o si «todos» no cubre todos los orígenes, un lateral
  por origen sobre `cotizaciones_origen_creado_idx` (`cotizaciones_origen_finales_idx`); lo propio por `cotizaciones_creador_idx`; la
  cartera, un lateral por lead de `mis_leads()` sobre `cotizaciones_lead_creado_idx`; el vehículo por `cotizaciones_vehiculo_creado_idx`; con
  `p_lead` (`?lead=`), una sola ruta por `cotizaciones_lead_creado_idx`, sin la cartera. La clase nunca es columna de un índice (`enum_eq` no
  es leakproof). Topes: la dueña y la chica ≤ 10 ms, Ana y Teo ≤ 50 (Ana con un vehículo de 5.005 o un lead ajeno, ≤ 100); la dueña ≤ 116
  bloques de `cotizaciones`; con 250.000 ≤ 1,2 × los bloques de 50.000 + 20 y ≤ máx(1,5 × t; t + 3 ms); `mis_leads()` 1 vez si va la cartera
  (ninguna con `p_lead`), `origenes_con_alcance()` ≤ 2 + 2 por ruta, `en_cartera()` ≤ una por fila leída de la cartera o del vehículo,
  ninguna a `alcance_de` ni a `_bajas_en_curso`; los índices de cada caso por nombre y ningún otro con bloques. Máximo: 100.
  La sección «Cotizaciones» de la ficha del lead (PostgREST, `lead_id = …`, `TAMANO_DE_VER_MAS` + 1, mismo archivo): la dueña ≤ 10 ms, Ana
  ≤ 50 con su cartera y ≤ 100 con el ajeno. Se lee al abrir la sección, con `diferido()` en su `diferidos.tsx`;
  `e2e/leads-cotizaciones.spec.ts`: ≤ 5.250 B, ≤ 65 nodos con 20 y ≤ 1.576 con 500, la 25.ª igual que la 1.ª.
  **La cotización aprobada** (`cotizaciones_aprobadas`, una fila por vehículo; `medir-cotizaciones-aprobadas.sql`, `db:medir:volumen`): tres lecturas por página, todas
  de ≤ 100 ids, una consulta y `.limit(ids.length)`, en paralelo con lo que ya se lee: la lista de vehículos por `cotizaciones_aprobadas_pkey (vehiculo_id)`, el
  listado de cotizaciones por el único `cotizaciones_aprobadas_cotizacion_id_key` y el historial (embebido en su misma lectura, con el alias `a` por los bytes de
  `TOPE_DE_BYTES`); más la marca de la guardada por clave primaria, tras `<Suspense>`. Con 50.000 cotizaciones: la dueña ≤ 10 ms y ≤ 600 buffers (medido 1,1 ms y
  247), sin `Seq Scan`; Ana, sin assert. La reposición al confirmar (`_aprobada_reponer()`, un vehículo con 100 y otro con 1.000 cotizaciones) lee 4 bloques de
  `cotizaciones` en los dos casos (`cotizaciones_vehiculo_creado_idx` hacia atrás, la primera fila): no crece con N. La siembra de volumen llama
  `_cotizaciones_aprobadas_rellenar()` (inserta sin triggers). `/cotizaciones/[id]`: 453,7 de 460 KB (+1,5 por la isla, sin Base UI nuevo).
  La pantalla (`e2e/cotizaciones-listado.spec.ts`, `e2e/listas-por-pagina-volumen.spec.ts`): una vista, 8 columnas, el máximo sin pedidos
  del navegador ni acciones: ≤ 39.500 B y ≤ 2.200 nodos; diez «Siguiente» no los suben. El resumen `?cotizacion=`: abrir desde la fila no
  pide nada; fuera de la página cuesta un pedido por `cotizaciones_pkey` y un `cotizaciones_listado()` de tamaño 1, más sus tres nombres.
  `router.refresh()` sólo si la URL trae una que nadie trajo (una vez por id) y en cada «Reintentar». Los nombres de la página (cliente,
  vehículo, autor) son tres lecturas por PK de ≤ 100 ids en paralelo (`leads_vista_por_ids`, `vehiculos_pkey`, `perfiles_pkey`): límite sin
  assert.
  Límites sin assert: el costo fijo de cada llamada, ≈ 160–240 buffers de `mis_permisos()` (abierto 4-77, `docs/PENDIENTES.md`); la preventa
  va por filtro; Ana «finales» filtra la clase sobre sus propias; con un vehículo muy cotizado, un `en_cartera()` por cada ajena; una tanda
  contigua en la papelera dentro de un índice entero se lee antes de descartarse. Los `count(*)` por origen de `origenes_resumen()` y del
  borrado de un origen recorren la tabla (tope 100 ms con las 50.000 sembradas; el total exacto es el abierto 4-79, `docs/PENDIENTES.md`).
- La hoja dibujada (`e2e/cotizar-hoja-200.spec.ts`, 100 % y 200 %): `[data-hoja]` más «Avanzado» abierto ≤ 500 nodos con la fórmula más
  grande, como quien cotiza sin ⚙ (~13 nodos por celda); está cerca del techo: lo que sume nodos a la hoja se para y se reporta. Al abrir,
  2 llamadas desde el servidor (+ `leerVehiculo` con un vehículo en la URL, + `leerClienteElegido` con un `?lead=`, + `integracionActiva`
  con `vehiculos.crear` en un origen de subasta, todas en el mismo `Promise.all`) y ninguna del navegador hasta abrir un panel; después un
  pedido por pausa de tecleo, con 1 en vuelo como máximo (`e2e/cotizar-hoja.spec.ts`).
- El ⚙ de una constante (`e2e/cotizar-ajuste-constante.spec.ts`): como quien configura, cada ⚙ son exactamente 3 nodos (botón, `svg`,
  `use`) y la subasta ≤ 585 nodos (techo 600); las dos personas ven las mismas celdas. Ningún pedido al abrir la hoja ni al pasar por una
  celda; abrir un ⚙ lee una fila por `formulas_publicada_unica`, ≤ 70 B. Panel, hook, lectura y action con `diferido()`.
- El ⚙ de un tipo de cambio (`e2e/cotizar-ajuste-tipo-cambio.spec.ts`): una llamada a `formula_tipo_cambio_del_nodo()`, ≤ 247 B; tras
  cambiarlo la hoja no relee. Bloque, hooks y action de `empresa` van con el panel por `diferido()`.
- Vista previa de la tarjeta (`e2e/cotizar-vista-previa.spec.ts`): ninguna lectura al abrir la hoja; suma un elemento al pie del resumen;
  el modal va en un portal, fuera de `[data-hoja]`, con `diferido()`. Al abrirlo, una `cotizacion_tarjeta()` por versión de la fórmula,
  recordada 5 min (`memoriaDeLectura`): ≤ 3.098 B como la dueña y ≤ 111 nodos la tarjeta. Lo acota la plantilla (≤ 20 grupos). «Copiar
  texto» no lee nada y «Descargar PDF» es un pedido por clic; los dos van fuera de `[data-tarjeta-de-cotizacion]`, en el chunk del modal.
- La página de una guardada lee en serie `cotizacion_hoja_guardada`, `cotizacion_evaluar(p_cotizacion)` y, con la hoja, el cliente y el
  vehículo por su nombre. Guardar: una `cotizacion_guardar`. Tras `<Suspense>` y con `cache()`, tres lecturas por PK en paralelo: la fila
  (`estado`, `reportes_count`), la favorita propia y el reporte propio (`(cotizacion_id, usuario_id)`). El Confirmar de moderar lee los
  reportes de esa cotización, ≤ 21 (uno por persona).
- «Enviar a la papelera» y «Marcar final» en la guardada: ninguna lectura nueva al abrir; cada acción es una RPC con su `revalidatePath`. El
  hueco es un Server Component y al navegador llega un `<button>` con las clases de `<Button>`; `<Confirmar>`, la action y su función van
  con `diferido()`.
- PDF de la tarjeta (`e2e/cotizar-pdf.spec.ts`): una cotización por PK — `cotizacion_hoja_guardada`, `cotizacion_evaluar(p_cotizacion)`,
  `cotizacion_tarjeta`, asesor y vehículo por PK y `leerAjustes()` (una RPC más que `getAjustes()`); el logo ≤ 1 MB con 2 s de espera. Topes:
  150 KB y 1,5 s. La tarjeta de lo guardado lo ofrece con un `<a download>` sin JS.
- Tarea de oro 2 (`e2e/cotizar-tarea-de-oro*.spec.ts`; deterministas: una parada nueva en el camino las rompe): robot < 30 s y KLM ≤ 90 s.
  Teclas de control: el tramo de la hoja hasta el PDF ≤ 29; con el panel del vehículo ≤ 29; con un enlace de subasta, exactamente 33; con
  el cliente, ≤ 29 si existe y ≤ 30 si es nuevo. Cada lado editable de la hoja y de «Avanzado» se alcanza con Tab, en orden.
- El panel de la ayuda de una tabla (sin spec propio): dibuja las primeras 1.000 filas con el aviso «Mostrando las 1.000 primeras filas.»
  (7 nodos por fila); una lectura por apertura, nunca con la hoja; el panel va en un chunk diferido.
- Comprobantes de una cotización (sin volumen: no crece): la guardada los lee una vez por pedido (`cache`), `limit TAMANO_DE_VER_MAS + 1`
  por `comprobantes_cotizacion_id_idx`, más el `estado` por PK. La serie vigente de Empresa es una fila. El aviso «Mostrando los 20 más
  recientes.» no ofrece camino (haría falta anular 20 veces una cotización; si pasa, «Ver más» por cursor `(emitido_en, numero)`). Emitir y
  anular van por `diferido()`.
- Comentarios de una cotización (sin medir con volumen): `cotizacion_comentarios()` lee las raíces de la más nueva a la más vieja por cursor
  `(creado_en, id)`, de a `TAMANO_DE_VER_MAS` (máx. 50), por
  `cotizaciones_comentarios_raices_idx (cotizacion_id, creado_en desc, id desc) where padre_id is null`, y por raíz sus primeras 20
  respuestas (máx. 50) por `cotizaciones_comentarios_respuestas_idx (padre_id, creado_en, id)`; `cotizacion_comentario_respuestas()` sigue
  por el mismo índice. ≤ 21 raíces × 21 respuestas por llamada. Borrar quita la fila salvo
  una raíz con respuestas vivas. Presupuesto a fijar al medir (1.000 comentarios y 500 respuestas: sin `Sort`, sin crecer entre 100 y
  1.000). Adjuntos ≤ 20 por cotización (`cotizacion_adjuntar` cuenta con `limit 20`), leídos con la primera página por
  `cotizaciones_adjuntos_cotizacion_id_idx` (`limit 21`); una URL firmada por clic; sin miniaturas. La pantalla lee al llegar la sección a la
  vista, dibuja ≤ `TOPE_DE_LO_CARGADO` entre raíces y respuestas («Ir a una fecha»: cursor `(inicio del día siguiente, uuid nulo)`); todo
  por `diferido()`.

## La rueda por rol

- `web.solicitar_asesor` y `web_expirar_solicitudes` evalúan `puede_estar_en_la_rueda()` por candidata (`usuarios_roles_pkey`,
  `roles_permisos_rol_clave_idx`). `medir-rueda.sql` (`db:medir:volumen`; 500 personas en la cola, 50.000 y 200.000 solicitudes): la
  elección ≤ 40 ms, `estado_cola_web` ≤ 40, `solicitar_asesor` ≤ 60, `web_expirar_solicitudes(20)` ≤ 800 ms; razón con 4 veces las
  solicitudes ≤ 1,5 (piso 3 ms). Las abiertas por persona, por `solicitudes_web_asesor_abiertas_idx`. Crece la cola, no las solicitudes.
- `cola_web_tablero()` (sin volumen): ≤ 201 habilitadas (`_acotar_pagina(p_tope, 100, 200)`), una `puede_estar_en_la_rueda` por fila y las
  abiertas por `solicitudes_web_asesor_abiertas_idx` (conteo exacto a propósito, acotado por el cupo ≤ 50). `cola_web_solicitudes()`: 21
  filas (`_acotar_pagina(p_tamano, 20, 50)`) por `solicitudes_contacto_web_estado_creado_idx (estado, creado_en desc, id desc)`, y el título
  por `id` de `web.vehiculos`.
- `/configuracion/cola-web`: tres lecturas al abrir (tablero, primera página de «Sin asignar», `ajustes_web`); «Ver más» de a 20 desde el
  navegador hasta 500; «Actualizar» y volver a la pestaña repiten las tres, nunca lo cargado.

## Formas de pantalla (cajas, al 100 y al 200 %)

- El panel de filtros va al costado si el contenedor del listado mide ≥ 40 rem (15 de panel + 1 de hueco + 24 de lista); si no, hoja.
  Ninguna pantalla se ensancha al 200 % (`sinScrollHorizontal()`), el texto no se corta (`sinTextoCortado()`, `exigirMarcadorQueCabe`) y los
  botones del pie del modal miden 44 px.
- La barra del listado: las cajas siguen el orden de lectura; el buscador mide 44 × 44 px y desde 24 rem muestra «Buscar» entero
  (`barra-de-filtros-200.spec.ts`, `barra-de-filtros-vehiculos-200.spec.ts`).
- Matriz de Roles a 412 px al 200 %: 0 de 72 filas con el control fuera de la vista, sin ensanchar la página.
- El celular corre en e2e sólo lo que tiene rama propia (tarjetas, hoja de filtros, pestañas del kanban, panel desde abajo, menú, pie del
  modal, foto, «Rol a la vista»): las pruebas marcadas se deciden con `E2E_HUELLA` + `scripts/comparar-anchos.mjs`. `E2E_ESTRES=1` repite
  «ítems por página» con la lectura lenta (al cerrar una tarea que toque `shared/ui/filtros` o la preferencia).
