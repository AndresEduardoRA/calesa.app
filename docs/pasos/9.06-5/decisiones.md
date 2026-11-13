# 9.06-5 · Datos: el avance, el resultado y la lista de la importación total (2026-11-12)

- **D51 · El avance se lee desde el navegador, cada 5 s,** con la sesión de quien mira (la policy «importaciones: leer»), sólo mientras haya alguna
  importación en `pendiente` o `procesando` (o una recién lanzada sin leer) y la pestaña a la vista. Sin realtime. Es la consulta de la lista
  acotada con `.in('id', ids)` por la PK, con a lo sumo 21 ids (`idsParaSondear` corta: el sondeo no crece con lo cargado).
- **D52 · «En pausa: sigue sola en unos minutos.»** Una importación en curso sin avance hace más de 2 min (`avance_en ?? creado_en`) está a medias y
  la retoma el job `importaciones-continuar`: es lo normal entre una invocación de 45 s y la siguiente. La pausa se mira **antes** que «Esperando a
  que empiece…»: una `pendiente` que nunca empezó (falló el despertar de `after()`) también está a medias. Sin botón «Retomar ahora» (pediría un
  pase y una acción para ahorrar ≤ 2 min). El reloj es el del navegador, fijado al llegar cada respuesta.
- **D53 · Resultado:** «2 creados, 1 ya existía y ninguno con errores.» (singular y plural por número). Fallida: «No terminó: <motivo>. Llegó a n
  de N filas.», con el primer `errores[].motivo` o «Se detuvo por un error».
- **D54 · «Descargar las rechazadas»** en una terminada o fallida con `ya_existian + rechazadas > 0`, mientras la base guarda el informe (30 días de
  `terminada_en`; después, «El detalle por fila se guarda 30 días.»). Desde el paso «Importando» del asistente que la lanzó, cada fila lleva las
  celdas del archivo de la persona (`archivo.filas[n - 1]`, D32); desde la lista, sólo «Fila, Resultado, Campo, Motivo». Un «ya existe» de lead
  dice «Ya hay un lead con este teléfono.»: la base no guarda de quién es, y el archivo tampoco lo dice. `importacion-rechazadas.csv`, `;` y BOM.
- **D55 · La lista «Importaciones» se lee desde el navegador al abrir la sección** (lista hija), de 20 en 20 con «Ver más» hasta 500 y su aviso de
  tope, por `importaciones_lista_propia_idx` o `importaciones_lista_idx`. Las propias; con `datos.importar.todo`, todas («De <quien>»), sin
  conmutador. Después de lanzar se recarga la primera página; al volver a la pantalla se lee de nuevo, así aparece también la que se dejó a mitad de
  la subida (auditoría de la 4b). Es una `<ul>` y no `@/shared/ui/lista`: una bitácora sin resumen que abrir, como el historial de una unidad de
  logística.
- **D56 · Sin `revalidatePath` en `crearImportacion`.** Ningún Server Component de `/datos` lee las importaciones totales: la lista y el avance son
  del navegador (D51, D55), y revalidar volvería a leer orígenes, catálogos y destinos a mitad del asistente sin cambiar nada de lo que se ve. Es
  una excepción a la regla de `.claude/rules/datos.md` (`revalidatePath` en la action que muta), por el mismo motivo que las de `docs/DECISIONES.md` del
  2026-10 (líneas 2190 y 3091): **para el coordinador**, anotarla allí. Reversible: si la lista pasa al servidor, se suma
  `revalidatePath('/datos')`.
- **D57 · Si el sondeo falla, se conserva lo último:** «Sin conexión: el avance se actualiza al volver.» o «No se pudo leer el avance. Se vuelve a
  intentar.», y el próximo tic reintenta. La lista que no carga: `EstadoError` con «Reintentar».
- **D58 · «Importar otro archivo» se ofrece apenas está lanzada:** la importación sigue en la lista, con su avance y su resultado.
