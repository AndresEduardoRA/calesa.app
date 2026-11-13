# 9.06-4b · Datos: la pantalla de la importación total hasta lanzar (2026-11-12)

- **D42 · «Importar» se ve siempre.** Sin ningún permiso de importar (`leads.crear`, `datos.importar.todo` o `vehiculos.crear` en algún origen),
  la pestaña sale apagada con «Tu rol no importa datos.» (lo que no se puede no se esconde, `docs/UX.md`). Pedir `?seccion=importar` sin permiso
  abre «Exportar».
- **D43 · Entidad y origen van en la URL** (`?entidad=leads|vehiculos&origen=<id>`, nuqs con `shallow: false`): el servidor lee sólo el contexto de
  esa entidad. El destino y todo lo del archivo viven en memoria: son elecciones de un archivo, no una vista.
- **D44 · Destino:** «Yo» (con `leads.crear`) y las personas activas sin bloqueo, por nombre, hasta 100 (`perfiles`, sólo `id, nombre`), con
  `<AvisoDeTope>` si hay más. Es la tabla del equipo, de decenas; si algún día pasa de 100 se suma la búsqueda por nombre con `ilike`, como la
  agenda. No se filtra por `leads.crear` porque no hay lector sin migración: `importacion_crear` rechaza a quien no puede recibir leads (22023 →
  `regla`, rechazo seguro: el navegador quita su objeto, D37).
- **D45 · Por tramos de 500 filas**, cediendo el hilo entre tramos, con «Preparando el archivo… n de N filas». Lo visto de teléfonos cruza los tramos
  (`preparadorDeFilas` de `leads`), así el resultado es idéntico al de una pasada. Salir de la pantalla cancela. Para no pasar de 300 líneas,
  `leads/entities/importacion/filas.ts` se partió: `catalogo.ts` (tipo y origen de una celda) y `repetidos.ts` (la marca de repetidos).
- **D46 · El mismo id sólo para el mismo intento:** mismo texto armado, entidad, mapeo (claves, valores y orden), destino y origen. «Reintentar»
  manda el intento guardado sin volver a convertir; un cambio es otro intento, con otro id (D36). Hueco aceptado: tras un fallo dudoso, salir de
  la pantalla y volver da un id nuevo (lo cubre la importación que se retoma, 9.06-5).
- **D47 · La conversión completa usa la misma entrada que la vista previa** (elecciones, columnas, países, locale y zona). Si la tabla de países
  llega después, la vista previa se recalcula con ella.
- **D48 · Vista previa:** las primeras 500, de 50 en 50, con «Ver sólo las filas con errores» (prendido si hay más errores que filas listas).
  «Importar N filas» cuenta las filas del archivo (todas viajan: las rechazadas quedan en el informe, D32). Cada fila se reconoce por sus dos
  primeras celdas con algo: la fila normalizada no lleva nombre.
- **D49 · El código de la sección se pide al abrirla** (`diferido()`): quien sólo exporta no lo paga.
- **D50 · Un error al leer el contexto en el servidor** va a `error.tsx` con «Reintentar» (`datosO`), como `/leads/importar`.
