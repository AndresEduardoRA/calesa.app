# Rendimiento

Versión completa (mediciones, historia): `docs/archivo/RENDIMIENTO.md`, sólo con grep.

Los topes vigentes de cada superficie que crece, su índice y el comando que los mide. La regla está en `.claude/rules/escala.md`. Un presupuesto no se sube para hacer pasar una medición: se explica o se arregla.

## Cómo se mide

- `pnpm db:medir` (`scripts/medir-listado.mjs`): corre cada `supabase/tests/medir-*.sql` contra el Supabase local en una transacción que se revierte; como `authenticated`, plan genérico (`force_generic_plan`), `EXPLAIN (ANALYZE, BUFFERS)`, mediana de 5 de 7 corridas. Asserta la forma del plan (índice nombrado, sin recorrer la tabla, lo que se descarta). Imprime la carga, la presión de disco y de CPU, el WAL y los checkpoints de cada corrida.
- `pnpm db:sembrar-volumen` (50.000 leads → 62.000 con los de la siembra; `-- --leads 200000` → 212.000; 10.000 vehículos, 200.000 seguimientos, 20.000 recordatorios, 8.000 oportunidades en una etapa; termina en `vacuum analyze`) y `pnpm db:medir:volumen`: `medir-escala.sql` (cada consulta del inventario, como la dueña con «todos» y como Ana con «propios»), `medir-jobs.sql`, `medir-bajas.sql`, `medir-importacion-volumen.sql`, `medir-equipo.sql`, `medir-rueda.sql`, `medir-evaluar.sql`, `medir-cotizaciones-lectura.sql`, `medir-vehiculos-lectura.sql`. Después, `pnpm db:reset`. Una medición que siembra dentro de su transacción hace `vacuum` antes y después (las filas muertas suman buffers).
- Buffers por relación (`pg_stat_get_xact_blocks_fetched`), no totales: el autovacuum de las tablas de permisos mueve los totales.
- Pantalla: `E2E_VOLUMEN=1 pnpm test:e2e` (volumen sembrado por SQL en `e2e/soporte/sql.ts`): pedidos, bytes de la primera respuesta y nodos del DOM, sin cronómetros.
- JS en frío: suma de los `.js` (gzip, sin caché) que el documento de la pantalla nombra (`e2e/soporte/js-en-frio.ts`); lo guarda `e2e/presupuesto-js.spec.ts` con `e2e/soporte/presupuestos.ts`.
- Los jobs y la baja con transacciones de verdad: `medir-jobs.sql`, `medir-bajas.sql` (pausa el cron `equipo-bajas` mientras mide). `pnpm db:carreras` para los candados.
- Los ms de lo que escribe a disco dependen de un `fsync` lento (5a-42): un job o una baja que cae sin que haya cambiado el trabajo (lotes, buffers) se anota con su carga y no se afloja el tope ni se reintenta a ciegas.

## Seguimientos de un lead

Sección «Seguimientos» de la ficha y pestaña del drawer.

- Página y tope: 20 por «Ver más», hasta 500 (`TAMANO_DE_PAGINA`, `TOPE_DE_LO_CARGADO`); más allá, «Ir a una fecha». Lectura: `lead_seguimientos()`.
- Índices: `seguimientos_lead_autor_idx (lead_id, usuario_id, ocurrido_en desc, id desc)` y `seguimientos_lead_publicos_idx` (parcial). «Recargar» tras un conflicto: primera página + `lead_seguimiento(p_lead, p_id)` por la clave primaria, ≤ 2 pedidos.
- Primera respuesta ≤ 24 KB con 20 ítems; 1 pedido al abrir la pestaña (+ los tipos activos). Nodos del drawer: ~1.700 tras 5 «Ver más», ~7.000 en el tope (`content-visibility: auto` por ítem).
- Mide: `db:medir` (página 1 y 501 ~7 ms); `e2e/leads-rapido-volumen.spec.ts`.

## Recordatorios de un lead

- Página y tope: 20 por «Ver más», hasta 500 por lista; «Completados» no se lee hasta abrirse. Lectura: `lead_recordatorios(p_lead, p_completados, …)` sobre la tabla; por id, `recordatorios_vista`.
- Índices (parciales): `recordatorios_lead_pendientes_idx (usuario_id, lead_id, recordar_en, id)` y `recordatorios_lead_completados_idx (usuario_id, lead_id, completado_en desc, id desc)`.
- Primera respuesta ≤ 14 KB con 20 ítems; 1 pedido al abrir (los pendientes), 1 más al abrir «Completados»; «Recargar»: 1 pedido, por su id.
- Aviso de vencidos de la ficha: `lead_ficha()` cuenta hasta 21 por `recordatorios_lead_pendientes_idx` («más de 20»).
- Mide: `db:medir` (sin filas descartadas en ningún plan); `e2e/leads-rapido-volumen.spec.ts`.

## Inventario de escala (9e)

Tope = lo que se dibuja o se lee de una vez; un número que se muestra es siempre acotado (`limit tope + 1`, «más de N»). Presupuesto = lo que asserta `pnpm db:medir:volumen` o el e2e. Mide todo `medir-escala.sql` salvo que se diga otro.

### Leads

- Listado, página: 100 filas por cursor (`MAXIMO_DE_PAGINA_DE_LEADS`), `leads_listado_idx`; 30 ms página 1 y 150 ms página profunda (página 100 por cursor); la policy se estima con `_lead_visible_para()` sobre `leads.cartera`. Cada fila recorrida cuesta ~0,4 µs.
- Quien tiene pocos leads (la «chica», 3): «míos» se lee por `leads_cartera_vista` e `leads_asesores_listado_idx (usuario_id, lead_creado_en desc, lead_id desc) include (tipo_acceso, revocado_en) where revocado_en is null` (la elige `fuenteDelListado()`); página 1 ≤ 30 ms, cursor ≤ 150, ≤ 3.000 descartes, con 62.000 y 212.000. Un alcance «todos» con cartera corta (`leads_cartera_corta()`, hasta 5.000 filas) también va por la cartera; la dueña (40 % de los leads) no. Límite: una persona con 500 leads en la papelera descarta ~530 en su página 1 (≤ 30 ms).
- Nombre y filtros por dos pasos: `leads_candidatos(p_filtros)` (`security definer`, devuelve `{ ids, completa, hasta }`, 300 candidatos, etapa W de hasta 4.000 filas por el orden del listado, etapa I por `leads_busqueda_idx gin (cartera, nombre gin_trgm_ops, atributos_publicos jsonb_path_ops) where eliminado_en is null and cartera <> '{}'`; `fastupdate = on`, `gin_pending_list_limit = 256`) y `leads_vista_por_ids(p_leads)` (invocador, SQL, `stable`, sin `strict`: se inlinea). Etapa W de un campo público de quien ve «todos»: hasta 10.000. No depende de N; `condicionesDeLaPagina()` no repite nombre, campo público ni etiqueta en el paso 2.
- Presupuestos de esos dos pasos, iguales con 62.000 y 212.000: nombre escaso ≤ 50 ms para las cuatro personas; texto y rango de un campo público ≤ 50 ms y 45.000 buffers; campo privado, tachados ocultos y primer pedido de la exportación ≤ 100 ms y 40.000 buffers (paso 1 ≤ 80 ms, paso 2 ≤ 40); conteo entero de la exportación con un valor denso ≤ 800 ms y 400.000 buffers. Berta lee ≤ 40 bloques del heap buscando un nombre ajeno (sin oráculo). Una etiqueta propia entra por `leads_candidatos()` (clave `etiquetas`, `leads_etiquetas_etiqueta_id_idx`); ≤ 100 ms.
- Mínimo del nombre: 3 letras o dígitos seguidos (`[[:alnum:]]{3}` en `_leads_candidatos_indexable()`; JS `[\p{L}\p{Nd}]{3}`); con 1 o 2 caracteres, 0 pedidos al servidor (`e2e/leads-listado-busqueda-minima.spec.ts`). Límite: una etiqueta puesta sólo en los 40.000 leads más viejos de la dueña cuesta ~138 ms con 212.000.
- Huella: `busqueda-leads.sql` (`db:probar`) y `busqueda-volumen.sql` (`db:medir:volumen`) comparan filas enteras por md5 entre la ruta de la vista y la de los candidatos.
- Filtros por origen y por tipo del lead: `leads_listado_idx` (un origen o tipo raro o sin leads, por `leads_origen_lead_id_idx` y `leads_tipo_lead_id_idx`); 100 ms. Sin índice compuesto. Para más de ~1.000.000 de leads, volver a medir con `db:sembrar-volumen -- --leads 1000000`.
- Atributo público: por `atributos_publicos`, 100 ms. Favoritos / tachados / etiqueta: unión por clave primaria con las marcas, 100 ms cada uno. Aviso de tachados ocultos: «más de 50» (`contarLeadsHasta`, `leads_tachados_pkey`), 100 ms.
- Buscar `#n`: `leads_ids_del_numero(p_numero, p_todos)`, hasta 100 ids; `leads_numeros_globales_numero_key` y `leads_numeros_propios_creador_idx (creado_por, numero)`; ≤ 5 ms (con la página ≤ 20), sin `Seq Scan`. Los números del listado son subconsultas escalares de la lista de columnas (no uniones); `tiene_permiso('leads.numero_global.ver')` se evalúa una vez por consulta, no por fila. Alta de un lead (número propio): `leads_contadores` por clave primaria, 80 ms.
- Ficha: «más de 100 vehículos» (`vehiculos_lead_idx`), 80 ms. Oportunidades de la ficha: 100 + `hay_mas` (`oportunidades_lead_id_idx`), 150 ms.
- Papelera de leads: 5 lotes por cursor (`LOTES_POR_PAGINA`), de cada uno los primeros 20 (`PRIMEROS_DEL_LOTE`) y «Mostrar los N» (≤ 200); `en_papelera` exacto ≤ 200; `lotes_papelera_tipo_idx`; 400 ms.
- «Quién lo tiene» (`leads_asesores`, 50 ms) y candidatos de cartera (`limit 500`, 50 ms). Catálogos (`leads_catalogos()`, 30 ms). Etiquetas: 50 por persona, «En N leads» hasta 1.001 (`leads_etiquetas_etiqueta_id_idx`), 300 ms.
- Selectores del alta (se leen desde el navegador al abrir el drawer: `lead_alta_contexto` y `leads_campos`): los tres catálogos al tope de 100 (`_origenes_lead_tope()`, `_tipos_lead_tope()`, `_tipos_seguimiento_tope()`), sin `clave` ni `icono`; 2 pedidos al abrir, respuesta < 40 KB sin comprimir con 100 + 100 + 100 (`e2e/leads-alta-contexto.spec.ts`); el documento de ninguna pantalla los lleva.
- Configuración de orígenes, tipos de lead y tipos de seguimiento: 100 cada uno («N de 100»); la sonda «¿algún lead lo usa?» es un `exists` por rango (`>= x and <= x`) sobre `leads_origen_lead_id_idx`, `leads_tipo_lead_id_idx`, `seguimientos_tipo_idx`; 100 ms la lista, 5 ms eliminar. `medir-escala.sql` la asserta con la columna (plan genérico) y con un origen de un solo lead.
- Iconos del catálogo (24 claves cerradas): listado de 100 filas ≤ 3.500 nodos y 48.000 B gz; las filas dibujan un símbolo compartido (`<use href>`); el shell y el alta no importan el catálogo (guarda).
- Exportar: lotes de 500, hasta 5.000, 5 por hora; hasta 5.001 ids de a 1.000 (`leads_listado_idx`), 100 ms; «Descargamos N» exacto.
- Importar: «Tus importaciones recientes» 20 de las últimas 24 h (`importaciones_leads`, 300 ms); vista previa 500 filas del archivo, 50 por página; lotes de 50 filas, 500 por archivo (`FILAS_POR_LOTE`). Mide `medir-importacion-volumen.sql` (`db:medir:volumen`): 500 filas ≤ 2 s con 62.000 y 212.000 leads, con `actividad` ≈ 23.000 y ≈ 124.000 (razón del tiempo por fila entre ambas, 0,8 a 1,2: falla si crece con `actividad`). `_lead_crear` busca «¿este intento ya entró por una adopción?» sólo si el alta trae `adoptar` (`actividad_intento_adopcion_idx`); la importación lo rechaza. `medir-importacion.sql` (`db:medir`, base recién reseteada): 8 s las 500 filas, `seed.sql` analiza.
- No se agrega un índice, trigger o columna a `leads` sin medir alta (80 ms), 500 filas importadas (≤ 2 s) y la baja de 200.000.

### Vehículos, orígenes, equipo y empresa

- Inventario, página: 50 por cursor (máximo 100, `MAXIMO_DE_PAGINA_DE_VEHICULOS`), `vehiculos_origen_listado_idx`; 20 ms página, 100 / 150 ms búsqueda y limpieza.
- Lectura de vehículos con 50.000 y 250.000 (`medir-vehiculos-lectura.sql`, `db:medir:volumen`): la dueña, Pía y la página de Beto («propios» sobre su cartera, `en_cartera` una vez por fila) ≤ 10 ms y 300 buffers (Beto ≤ 1.000); `puede_vehiculo()` ≤ 5 ms (un `alcance_de` y un `en_cartera`); razón de ms con 250.000 sobre 50.000 ≤ máx(1,5 × t; t + 3 ms) y buffers ≤ 1,2 × + 20. Límite abierto (4-23, sin assert): quien tiene vehículos sin lead recorre el origen entero (~33 ms con 250.000).
- Papelera de vehículos: como la de leads (5 lotes, primeros 20), 200 ms. Aviso de archivos por borrar: «más de 1.000», `cola_gc_storage_edad_idx`, 50 ms. Galería de fotos: 24 por vehículo (`vehiculos_imagenes_hash_unico`). Vínculos e interesados de un vehículo: 50 / 100, «Mostrando los 50 vínculos / 100 interesados más recientes.» (`vehiculos_vinculos_vehiculo_idx`); en el lead, los tres bloques de «Vehículos» 100 / 100 / 50. Selector «agregar vehículo»: 20, lee 21, 300 ms.
- Orígenes: resumen y categorías con uso, 100 / 50 ms (exento, administración). Tipos de cambio, historial: 30 («Mostrando los 30 cambios más recientes.»).
- Equipo, lista: 100 por nombre (`TOPE_DEL_EQUIPO`; la RPC `equipo_lista()` lee 101) en dos etapas: W recorre las primeras 2.000 del estado, de a una (perezosa, no `count(*)`), e I el trigram. Índices: `perfiles_vigentes_orden_idx`, `perfiles_estado_orden_idx`, `perfiles_busqueda_idx` (GIN trigram; `unaccent` declarada `immutable`, `reindex` si cambia). Presupuesto: buffers ≤ 150 la consulta sin texto (106 medidos con 100.007 personas), < 3.500 nodos (1.673 medidos); la RPC entera sin texto 405 buffers. Mínimo 3 letras o dígitos, 0 pedidos con 1 o 2 (`e2e/equipo-busqueda-minima.spec.ts`); `lista-equipo.tsx` no llama a `setParametros` si `q` no cambia. Miniatura de 96 px, no el avatar de 512. Mide `medir-equipo.sql` (10.000 y 100.000 personas; no crece más de 1,5 veces, piso 60 buffers).
- Roles, personas de cada rol: `roles_personas()` hasta 1.001 por rol («más de 1.000 personas»), `usuarios_roles_rol_idx`, ≤ 150 buffers y ≤ 1.001 filas con un rol de 100.007 (medidos: 24 buffers). La matriz de Roles no pagina: 72 filas de catálogo más hasta 18 de niveles (`_niveles_tope()` = 10; 9 que generan permisos × 2) = 90 (`e2e/roles-niveles.spec.ts`).

### Baja de una persona

- Vista previa: hasta 1.001 («más de 1.000»), `leads_asesores_usuario_vigente_idx`, ≤ 300 ms (con 200.000, 44–73 ms; `_bajas_en_curso()` va envuelta en `(select …)::uuid[]`, un InitPlan).
- Baja: lotes de 5.000 por cursor (cada lote sigue desde el último lead; ids del índice y candado por clave, separados). Mide `medir-bajas.sql` con 200.000 leads de una persona: la llamada (primer lote) ≤ 4.000 ms; el job `equipo-bajas`, cada corrida corta a 1,5 s: ≤ 12 corridas, ≤ 20.000 ms en total y la corrida más larga ≤ 3.000 ms. El trabajo es el que cuenta: 40 lotes y ~15,6 M buffers (el 5a-42 propone juzgar el tiempo sólo con una ventana sana, ningún checkpoint con `sync` > 2 s y presión de E/S del kernel ≤ 30 %: no aplicado).
- Por qué cuesta lo que cuesta: `cartera` es una columna indexada en `leads_busqueda_idx`, ningún update de la baja es HOT (11 btree de `leads`). Sacar la cartera del GIN rompe la búsqueda (Berta leería 25.016 leads ajenos): descartado. Con lotes de 1.000 son 20 corridas y la guarda cae.

### Jobs (100.000 filas por purgar)

Mide `medir-jobs.sql`; los presupuestos son 10 a 30 veces lo típico.

- `papelera-purgar`: 50 lotes (10.000 leads) por corrida, cada hora.
- `limpieza-automatica`: mueve 200 y revisa 1.000 más.
- `importaciones-vinculos-purgar` y `apibara-consultas-purgar`: lotes de 10.000, 10 por corrida.
- `storage-gc`: reclama 100 por ronda, 5 rondas; 2.000 huérfanos encolados por pasada. El barrido de huérfanos lleva un cursor por bucket (`cola_gc_barrido`): 10.000 objetos examinados por pasada, 5 pasadas por corrida; no recorre el bucket entero.
- `leads-campos-privacidad` (lotes de 5.000, hasta 10 por corrida) y `equipo-bajas` (arriba).

## Ítems por página (9g): qué lista lo admite y su máximo

Elige 10, 25, 50 o 100 (`listas.por_pagina`, `?por=`); cada lista declara su máximo y el selector llega hasta ahí. Un máximo se gana midiendo: `db:medir:volumen` y `e2e/listas-por-pagina-volumen.spec.ts` (bytes, nodos, página profunda). El selector va arriba de la lista en el celular y se dibuja una sola vista (`UnaSolaVista`, según el `user-agent`).

- Listado de leads: 100; 3.500 nodos y 48 KB gz (`leads-escala.spec.ts`, `?por=100`); medido ~2.300 nodos.
- Inventario de vehículos: 100; 6.000 nodos y 60 KB gz (`vehiculos-por-pagina.spec.ts`); medido ~4.700 nodos, 50 KB.
- Papeleras: no entran al selector (5 lotes × 20 ya son 100 filas). «Ver más» de seguimientos y recordatorios (20, tope 500), columna del kanban (50, tope 500, `TAMANO_DE_COLUMNA`) y las listas de tope fijo no tienen selector.
- En la base cada RPC con tamaño acota con `_acotar_pagina(pedido, por_defecto, máximo)`: seguimientos y recordatorios 20 hasta 50; papeleras 6 hasta 51; `embudo_tablero` 50 hasta 100 por columna y 500 hasta 1.000 de total; `embudo_etapa_pagina` 50 hasta 100. El listado y el inventario se leen por PostgREST: `max_rows` = 1.000. `escala.sql` llama las RPC con 100000, 51, 30, 0, -1 y nulo.

## Kanban y oportunidades

- Tablero: 6 columnas × 50, «500+» por columna, `oportunidades_tablero_idx`; la policy de `oportunidades` pregunta por fila `_lead_vivo_en_mi_cartera(lead_id)` (no arma el arreglo de la cartera). Presupuestos: tablero 800 ms, «Ver más» 500 ms, buscar 700 / 200 ms; primera página de una columna, «Ver más» y total acotado ≤ 25 ms (la guarda asserta `oportunidades_tablero_idx`, sin recorrer `oportunidades`, ≤ 200 descartes). «Ver más» hasta 500 por columna con aviso.
- Nodos del DOM de una columna en el tope (500 tarjetas): ≤ 10.250; el «⋯» de cada tarjeta cuesta exactamente 3 nodos (`<use>` a un símbolo de `src/shared/ui/lista/simbolos-de-lista.tsx`; `e2e/mas-acciones-icono.spec.ts`). El servidor dibuja una sola distribución (columnas o pestañas) según el ancho de la petición.
- Oportunidades de la ficha: 10 a la vista (las abiertas primero), «Ver todas» (`?todas=1`) hasta 100. Documento de la ficha ≤ 66 KB con la sección abierta y ≤ 400 KB con «Ver todas» (cada oportunidad pesa ~3,5 KB). `e2e/leads-oportunidades-ver-todas.spec.ts`.

## JS en frío (con gzip, lo que el documento nombra)

- `/leads` ≤ 530 KB (medido 503,5), `/perfil` ≤ 440 KB (413,5), `/vehiculos` ≤ 500 KB (468,6). `/cotizaciones/nuevo` mide 426,8 KB (24 chunks; 423,8 antes del 4.13-4a) y su presupuesto formal falta (4.13-4d, `e2e/soporte/presupuestos.ts`).
- El `index.ts` de un módulo no exporta componentes: cada pantalla trae los suyos por `pantallas/<pantalla>.ts` (sólo `src/app`). La guarda `scripts/guardas/barriles.test.ts` falla, con el camino, si un `index.ts` llega a un `'use client'`.
- Documento de `/perfil` (HTML con el payload RSC, sin comprimir) ≤ 82 KB (`PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB`), igual con la semilla y con 100 + 100 + 100 catálogos (±1 KB); medido 80.338 B. El layout `(app)` no manda catálogos al alta: `<AltaDeLead>` no recibe nada y los lee del navegador (`infra/contexto-de-alta.client.ts`, memoria de 60 s en `shared/lib/memoria-de-lectura.ts`).
- Ficha, «Datos»: ≤ 43 KB sobre `/perfil`, igual con la semilla y con 100 orígenes + 100 tipos (manda los campos activos y el origen y el tipo de ese lead; el panel de edición los lee al abrirse, `leerCatalogosDeEdicion()`); `e2e/leads-ficha.spec.ts`.
- «Nuevo lead» es un solo drawer: 1 montaje y 1 entrada animada por apertura, 1 lectura de cada pedido (`e2e/leads-alta-un-drawer.spec.ts`).

## Cotizador (fórmula, diseño, cotizaciones)

Salvo que se diga otro, mide `pnpm db:medir` en la base de la semilla; el tope en ms es la mayor mediana de varias corridas × 3, el de buffers lo medido + 20 %, y la razón entre tamaños la fija el pedido. Cada guarda se prueba con una versión mala (cuadrática, N+1) que debe fallar.

- `validar_formula()` (`medir-validar-formula.sql`): 200 nodos ≤ 26 ms, 2.000 ≤ 245 ms, razón ≤ 12. La función es `STABLE`; la llamada va sobre una subconsulta con `offset 0` (inmutable, caería en Planning Time). 0 buffers.
- `evaluar_formula()` (`medir-evaluar-formula.sql`): 200 nodos ≤ 16 ms, 2.000 ≤ 136 ms, razón ≤ 12, con una columna comprimida ≤ 1,5 veces los literales. Informativo: 200 nodos con 4 tablas vivas de 1.000 filas ~28 ms, congeladas ~16 ms; 2.000 nodos congeladas ~164 ms. Una guarda de texto en `evaluar-formula.sql` (`db:probar`) cae si la pasada lee un argumento dentro de un bucle.
- `validar_diseno()` (`medir-validar-diseno.sql`): 206 ítems ≤ 15 ms, 2.018 ≤ 136 ms, razón ≤ 12; columna externa 206 ítems ≤ 320 buffers y 2.018 ≤ 2.000 (razón ≤ 12); comprimida ≤ 1,5 veces los literales.
- Guardar y publicar (`medir-publicar.sql`, requiere `db:reset` entre corridas): `formula_publicar` 206 ítems ≤ 55 ms y 2.350 buffers, 2.018 ≤ 550 ms y 20.600 buffers (razón ≤ 12 en ms y buffers); `formula_guardar_borrador` ≤ 36 / 320 ms; `_compilar_visibilidad` ≤ 4 / 27 ms y, con columna externa, ≤ 60 / 375 buffers. Las sondas de uso (`_tono_en_uso`, `_nivel_uso`; índices `formulas_tonos_idx`, `formulas_niveles_idx`, con CTE `materialized` para que el GIN conduzca) se miden con `formulas` casi vacía y por crecimiento: 1.800 versiones más suman ≤ 1/3 de lo que suma una copia sin GIN (medido 18 bloques contra 100).
- `_nodos_visibles()` (`medir-nodos-visibles.sql`): razón 255 → 2.487 nodos ≤ 12 en ms y buffers, ≤ 20 ms con 2.487 nodos, nunca más que leer la fila de la fórmula + 600 buffers. `_nivel_uso()` ≤ 100 ms con 2.000 versiones; `niveles_con_uso()` (peor caso, 9 niveles en uso) ≤ 60 ms con 200 versiones por nivel y ≤ 400 ms con 2.000.
- `cotizacion_hoja()` (`medir-cotizacion-hoja.sql`): la hoja de las capturas como dueña ≤ 16 KB y 10 ms (la asesora, más chica); `planilla_usa` ≤ 10 ms; con una tabla viva de 1.000 filas ≤ 12 bloques de `tablas_referencia_filas`; sintética de 255 nodos ≤ 25 ms, de 2.487 ≤ 300 ms, razón ≤ 15; 0 bloques de `cotizaciones` y `cotizaciones_revisiones`. Lineal (~140 bytes por ítem); el diseño no tiene tope de tamaño (4-30). Una sola función SQL por nodo: cada llamada de más a una función con `set search_path` costaba ~50 µs por ítem.
- `cotizacion_evaluar()` (`medir-evaluar.sql`, `db:medir:volumen`, 200 llamadas seguidas, `authenticated`, plan genérico, con 50.000 y 250.000 cotizaciones): fórmula del seed mediana ≤ 10 ms y p95 ≤ 20 (medido ~4); sintética de 200 nodos con 4 tablas de 1.000 filas p95 ≤ 50 (medido ~43); p95 con 250.000 sobre 50.000 ≤ 1,5. Guarda de ARMAR: lee a lo sumo `1,2 × (páginas + 4 × (hojas + 3) + costo fijo)` buffers, y por relación: los bloques de `tablas_referencia(_filas)` ≤ los de la consulta de referencia sobre `t1`..`t4` + 2 (cae con una tabla de más, N+1 por tabla o por fila). La firma de la hoja abierta suma ≤ 3 ms.
- `cotizacion_crear()` (`medir-cotizacion-crear.sql`) y `cotizacion_guardar()` (`medir-cotizacion-guardar.sql`), con 50.000 y 250.000: ≤ 20 ms y 1.500 buffers (la sintética de guardar ≤ 60 ms y 1.000); 0 recorridos enteros de `cotizaciones` o sus revisiones (`pg_stat_xact_user_tables.seq_scan`); razón de ms ≤ máx(1,5 × t; t + 3 ms) y buffers ≤ 1,2 × + 20. El intento se busca por `cotizacion_id` (el índice único empieza por ahí).
- Lectura de cotizaciones (`medir-cotizaciones-lectura.sql`): páginas de n + 1 = 101 por cursor `(creado_en desc, id desc)` como la dueña, Ana («propios») y la «chica» ≤ 10 ms y 300 buffers; `cotizacion_leer` ≤ 10 ms; `cotizacion_revisiones` (500) ≤ 12 ms; razón con 250.000 ≤ máx(1; 5 × t; t + 3 ms); 0 llamadas por fila a `en_cartera`, `alcance_de` y `mis_leads()`, a lo sumo 2 a `origenes_con_alcance`. Límite abierto (4-14, sin assert, se arregla en el 4.16): «todas las que veo» de quien ve «propios» recorre `cotizaciones_listado_idx` entera (Ana ~1,6 s con 250.000).
- La hoja dibujada (`e2e/cotizar-hoja-200.spec.ts`, ambos proyectos, 100 % y 200 %): `[data-hoja]` más el diálogo de «Avanzado» abierto ≤ 460 nodos con la fórmula más grande (31 celdas; medido 434 al abrir y 453 usada con el modal, 4.13-4a; antes, con «Avanzado» en línea, 413 y 432; ~13 nodos por celda). Al abrir, 2 llamadas desde el servidor y ninguna del navegador; después un pedido por pausa de tecleo, con 1 en vuelo como máximo (`e2e/cotizar-hoja.spec.ts`).

## La rueda por rol

`web.solicitar_asesor` y `web_expirar_solicitudes` evalúan `puede_estar_en_la_rueda()` por candidata de la cola (`usuarios_roles_pkey`, `roles_permisos_rol_clave_idx`). `medir-rueda.sql` (`db:medir:volumen`; 500 personas en la cola, 50.000 y 200.000 solicitudes): la elección de la rueda ≤ 40 ms, `estado_cola_web` ≤ 40, `solicitar_asesor` ≤ 60, `web_expirar_solicitudes(20)` ≤ 800 ms; razón con 4 veces las solicitudes ≤ 1,5 (piso 3 ms). Las abiertas de cada persona se cuentan por `solicitudes_web_asesor_abiertas_idx`, sin recorrer `solicitudes_contacto_web`. La regla cuesta ~16 µs por persona de la cola; lo que crece es la cola, no las solicitudes ni los leads.

## Formas de pantalla (cajas, al 100 y al 200 %)

- El panel de filtros va al costado si el contenedor del listado mide ≥ 40 rem (15 de panel + 1 de hueco + 24 de lista); si no, hoja. Ninguna pantalla se ensancha al 200 % (`sinScrollHorizontal()`), el texto no se corta (`sinTextoCortado()`, `exigirMarcadorQueCabe`) y los botones del pie del modal miden 44 px.
- La barra del listado: las cajas siguen el orden de lectura; el buscador mide 44 × 44 px y desde 24 rem muestra «Buscar» entero (`barra-de-filtros-200.spec.ts`, `barra-de-filtros-vehiculos-200.spec.ts`).
- Matriz de Roles a 412 px al 200 %: 0 de 72 filas con el control fuera de la vista, sin ensanchar la página.
- El celular corre en e2e sólo lo que tiene rama propia (tarjetas, hoja de filtros, pestañas del kanban, panel desde abajo, menú, pie del modal, foto, «Rol a la vista»): las pruebas marcadas se deciden con `E2E_HUELLA` + `scripts/comparar-anchos.mjs`. `E2E_ESTRES=1` repite «ítems por página» con la lectura lenta (al cerrar una tarea que toque `shared/ui/filtros` o la preferencia).
