// Las mediciones de `pnpm db:medir` y `pnpm db:medir:volumen` (`scripts/medir-listado.mjs` las corre): cada una con su título y las
// corridas que hay detrás de su número, y los datos del repo que la base no puede leer y se le pasan en una tabla temporal.
// Cada medición dice cuántas corridas hay detrás de su número: la mediana de 5 (las consultas) o una sola (la importación, los jobs y la
// baja: gastan lo que miden, no se repiten).
export const MEDIANA = 'mediana de 5 corridas'
export const UNA = 'una corrida'
export const MEDICIONES_BASE = [
  ['supabase/tests/medir-listado.sql', 'Listado de leads, 2.000 leads sintéticos', MEDIANA],
  [
    'supabase/tests/medir-embudo.sql',
    'Kanban de oportunidades, 2.000 leads y 10.000 oportunidades',
    MEDIANA,
  ],
  [
    'supabase/tests/medir-importacion.sql',
    'Importación de leads, 500 filas en lotes de 50 sobre 22.000 filas de actividad',
    UNA,
  ],
  [
    'supabase/tests/medir-volumen.sql',
    'Listas de un lead, 20.000 seguimientos y 5.000 recordatorios (con la forma del plan asertada)',
    MEDIANA,
  ],
  [
    'supabase/tests/medir-validar-formula.sql',
    'validar_formula() con una fórmula sintética de 200 y de 2.000 nodos, como authenticated (ms y buffers del EXPLAIN)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-validar-diseno.sql',
    'validar_diseno() con un diseño sintético de unos 200 y de unos 2.000 ítems, como authenticated (ms y buffers del EXPLAIN, con los argumentos como literales y de una columna fuera de línea y comprimida)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-publicar.sql',
    'formula_guardar_borrador() y formula_publicar() con un diseño sintético de unos 200 y de unos 2.000 ítems, como authenticated (ms y buffers del EXPLAIN), la compilación de la visibilidad aislada y las sondas de uso de tonos y niveles con 200 y 2.000 versiones archivadas',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-nodos-visibles.sql',
    '_nodos_visibles() con 255 y con 2.487 nodos (ms y buffers del EXPLAIN, contra lo que cuesta leer la fila), _nivel_uso() con 200 y con 2.000 versiones que nombran el nivel y niveles_con_uso() con los 9 niveles que pueden tener permisos en uso (200 y 2.000 versiones cada uno)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-cotizacion-crear.sql',
    'cotizacion_crear() con 50.000 y con 250.000 cotizaciones, como authenticated con el plan genérico: una preventa de la dueña con vehículo, una de la asesora («propios»), cargando el vehículo a mano y el intento repetido (ms y buffers del EXPLAIN de la llamada entera, y que no recorre la tabla)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-cotizacion-hoja.sql',
    'cotizacion_hoja() como authenticated con el plan genérico: la hoja de las capturas como dueña y como asesora (ms, bytes de la respuesta y que no lee cotizaciones ni sus revisiones), los atajos de una tabla viva de 1.000 filas, las sintéticas de 255 y de 2.487 nodos, cotizacion_evaluar() por origen con y sin la hoja abierta que firma la base (ms) y cotizacion_tabla() de esa tabla viva con y sin la hoja abierta, como la dueña y como una asesora con «costos» (ms y bytes)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-cotizacion-hoja-guardada.sql',
    'cotizacion_hoja_guardada() con 50.000 y con 250.000 cotizaciones, como authenticated con el plan genérico: la del medio de una cadena de tres como la dueña (ve la anterior y la nueva) y como la asesora («propios»: la nueva, oculta) (ms y buffers del EXPLAIN, bytes de la respuesta, que no recorre cotizaciones y que llama 2 veces a _nodos_visibles)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-cotizacion-encima.sql',
    'cotizacion_encima() con 50.000 y con 250.000 cotizaciones, como authenticated con el plan genérico: la dueña y la asesora («propios») cotizan encima de una anterior distinta en cada corrida (ms y buffers del EXPLAIN de la llamada entera, y que no recorre cotizaciones)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-cotizacion-guardar.sql',
    'cotizacion_guardar() con 50.000 y con 250.000 cotizaciones, como authenticated con el plan genérico: una preventa de la dueña, una de la asesora («propios»), cambiando de vehículo, sin cambios, el intento repetido y la fórmula sintética de 200 nodos con 4 tablas de 1.000 filas (ms y buffers del EXPLAIN de la llamada entera, y que no recorre cotizaciones ni sus revisiones)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-evaluar-formula.sql',
    'evaluar_formula() con una evaluación sintética de 200 y de 2.000 nodos y con 4 tablas de 1.000 filas, como authenticated (ms y buffers del EXPLAIN)',
    'mediana de 5 de 7 corridas',
  ],
]
// Las que necesitan el volumen de `pnpm db:sembrar-volumen` (50.000 leads…): aparte, porque la base de
// la semilla no lo tiene. `pnpm db:medir:volumen`; después, `pnpm db:reset`.
export const MEDICIONES_CON_VOLUMEN = [
  [
    'supabase/tests/medir-escala.sql',
    'Escala de toda la app, 50.000 leads y 50.000 cotizaciones sembradas (dueña «todos» y Ana «propios»)',
    MEDIANA,
  ],
  [
    'supabase/tests/busqueda-volumen.sql',
    'La búsqueda por candidatos contra la consulta de siempre: la huella md5 de las filas enteras, en la base real con volumen (ñ, tildes y comodines)',
    UNA,
  ],
  [
    'supabase/tests/medir-importacion-volumen.sql',
    'Importar 500 filas en lotes de 50, con 23.000 y con 124.000 filas de actividad (con transacciones de verdad: confirma y borra lo que crea)',
    UNA,
  ],
  [
    'supabase/tests/medir-equipo.sql',
    'La lista del equipo con 100.000 personas: buffers leídos por cada etapa de `equipo_lista` (no ms: el plan y las filas que lee, con 10.000 y con 100.000)',
    UNA,
  ],
  [
    'supabase/tests/medir-rueda.sql',
    'La rueda de turnos por rol: 500 personas, 60 roles y 50.000 y 200.000 solicitudes (el costo de preguntar al repartir no crece con las solicitudes)',
    MEDIANA,
  ],
  ['supabase/tests/medir-jobs.sql', 'Los jobs con 100.000 filas por purgar (ms por corrida)', UNA],
  [
    'supabase/tests/medir-evaluar.sql',
    'cotizacion_evaluar() con 50.000 y con 250.000 cotizaciones, como authenticated con el permiso de la transacción: 200 llamadas seguidas con el plan genérico (ms y buffers de la llamada entera, de ARMAR y de EVALUAR)',
    'mediana y p95 de 200 llamadas',
  ],
  [
    'supabase/tests/medir-vehiculos-lectura.sql',
    'La lectura de vehículos con 50.000 y con 250.000 vivos, como authenticated y con el plan genérico: una página de n + 1 del inventario (primera y profunda por cursor) de la dueña («todos»), de Pía («propios», lo que creó) y de Beto («propios», 50.000 leads en su cartera), y puede_vehiculo() de Beto, con la policy por fila (ms y buffers del EXPLAIN, y las llamadas por página); la «chica», sin assert de tiempo (4-23)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-vehiculos-inventario.sql',
    'El inventario por rutas (vehiculos_inventario()) con 50.000 y con 250.000 vivos, como authenticated con el plan normal: página 1, profunda y «Anterior» de Pía (también con búsqueda, fase y atributos), de la «chica», de Beto (cartera de 50.000) y de Vera (cartera de 5.000), y la dueña; ms, bloques de vehiculos por relación, crecimiento con N y llamadas (en_cartera de Beto ≤ filas + portadas); y «contra hoy», la consulta de PostgREST sobre la tabla, como nota (4-23)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-vehiculos-inventario-forma.sql',
    'La forma del plan de vehiculos_inventario() con 50.000 y con 250.000 vivos, como authenticated: los cuatro puntos por caso y sentido (cada ruta por su índice bajo su Limit, la cartera por un lateral, sin recorrer vehiculos y sin releer la fila) y que la forma muerde; el Planning Time y el plegado, como notas',
    UNA,
  ],
  [
    'supabase/tests/medir-vehiculos-inventario-guarda.sql',
    'La guarda del inventario: lo de hoy (PostgREST sobre la tabla) para la «chica» crece con N de 50.000 a 250.000 vivos (bloques de vehiculos y ms); si no, la medición de la función no prueba nada',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-vehiculos-inventario-costo-fijo.sql',
    'El costo fijo de cada llamada al inventario (4-77): origenes_con_alcance() de una persona con una concesión y de otra con una por cada permiso y origen, sin volumen (ms y buffers del EXPLAIN, bloques de perfiles, usuarios_roles y roles_permisos, y las filas de mis_permisos())',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-cotizaciones-lectura.sql',
    'La lectura de cotizaciones con 50.000 y con 250.000 filas, como authenticated y con el plan genérico: una página de n + 1 (primera y profunda por cursor) de la dueña («todas») y de Ana y la «chica» («mías»), con la policy por fila (ms y buffers del EXPLAIN, y las llamadas por página)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-cotizaciones-listado.sql',
    'El listado /cotizaciones (cotizaciones_listado()) con 50.000 y con 250.000 filas, como authenticated y con el plan genérico: la página 1, una profunda por cursor y una hacia atrás de la dueña (por origen, clase y «mías»), de Ana («propios», con su cartera y un vehículo muy cotizado), de la «chica» y de Teo («todos» en un origen), un lead (de su cartera y ajeno) y la lectura de la sección del lead, con los bloques de cotizaciones por relación y las llamadas; y la guarda: lo de hoy por PostgREST rompe los topes (4-14)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-panel-ultima-cotizacion.sql',
    '«Últ. cotización» del panel del vehículo con 50.000 y con 250.000 vivos, como authenticated y con el plan genérico: una página de n + 1 de los cotizados de un origen (primera y profunda por cursor) de la dueña, de Pía y de Beto, por vehiculos_cotizado_idx (ms y buffers del EXPLAIN); la «chica», sin assert (4-23)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-panel-cierre-subasta.sql',
    '«Cierre subasta» del panel del vehículo con 50.000 y con 250.000 vivos, como authenticated y con el plan genérico: una página de n + 1 de las subastas vivas de un origen desde ahora menos 24 h (primera y profunda por cursor) de la dueña, de Pía y de Beto, por vehiculos_cierre_subasta_idx (ms y buffers del EXPLAIN); la «chica», sin assert (4-23)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-historial-del-vehiculo.sql',
    'El historial de un vehículo con 5.000 cotizaciones entre 50.000 y 250.000, como authenticated y con el plan genérico: una página de n + 1 (primera y profunda por cursor) de la dueña, por cotizaciones_vehiculo_creado_idx (ms y buffers del EXPLAIN); Ana («propios»), sin assert',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-lead-oportunidades.sql',
    'Las oportunidades de un lead por cursor con 1.000 en el lead (500 abiertas y 500 cerradas) y 20.000 de fondo, como authenticated y con el plan genérico: la página 1, una profunda de las abiertas, el paso de abiertas a cerradas y una profunda de las cerradas de Ana, por oportunidades_lead_abiertas_idx y oportunidades_lead_cerradas_idx (ms y bloques por relación de la llamada real; el plan de cada ruta)',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-cartera-reciente.sql',
    '«Míos» del panel del cliente por lo más reciente, con el volumen sembrado y como authenticated con el plan genérico: una página de n + 1 de la cartera (primera, profunda por cursor y la clase cliente) de la dueña, de Ana y de Berta, por leads_asesores_reciente_idx (ms y buffers del EXPLAIN); la clase ausente de la dueña (tope 100 ms), el costo del trigger de lo reciente en un seguimiento y el relleno de la migración con todo el volumen; la «chica», sin assert',
    'mediana de 5 de 7 corridas',
  ],
  [
    'supabase/tests/medir-bajas.sql',
    'La baja de una persona con 200.000 leads (con transacciones de verdad: confirma y borra lo que crea)',
    UNA,
  ],
]

// Lo que una medición lee del repo: la base no lee archivos, así que se le antepone a la entrada de psql una tabla temporal
// `<nombre> (doc jsonb)` con una clave de un JSON. Las comillas dólar pasan el texto sin procesar escapes.
export const DATOS_DE_MEDICION = {
  'supabase/tests/medir-validar-formula.sql': {
    _formulas_sinteticas: ['supabase/tests/corpus-de-formula.json', 'sinteticas'],
  },
  'supabase/tests/medir-validar-diseno.sql': {
    _disenos_sinteticos: ['supabase/tests/corpus-de-diseno.json', 'sinteticas'],
  },
  'supabase/tests/medir-publicar.sql': {
    _disenos_sinteticos: ['supabase/tests/corpus-de-diseno.json', 'sinteticas'],
  },
  'supabase/tests/medir-nodos-visibles.sql': {
    _disenos_sinteticos: ['supabase/tests/corpus-de-diseno.json', 'sinteticas'],
  },
  'supabase/tests/medir-evaluar-formula.sql': {
    _sinteticas_del_motor: ['supabase/tests/corpus-del-motor.json', 'sinteticas'],
  },
  'supabase/tests/medir-evaluar.sql': {
    _sinteticas_del_motor: ['supabase/tests/corpus-del-motor.json', 'sinteticas'],
  },
  'supabase/tests/medir-cotizacion-hoja.sql': {
    _disenos_sinteticos: ['supabase/tests/corpus-de-diseno.json', 'sinteticas'],
  },
  'supabase/tests/medir-cotizacion-guardar.sql': {
    _sinteticas_del_motor: ['supabase/tests/corpus-del-motor.json', 'sinteticas'],
  },
}
