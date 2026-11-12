# 9.05-2b · Datos: exportar los vehículos de un origen (2026-11-12)

- **D21 · Se parte otra vez:** la 9.05-2b lleva vehículos; la 9.05-2c, cotizaciones. Juntas eran 8 commits de código y sus lecturas no se parecen
  (tabla de a 1.000 contra una RPC de a 100). «Partes estimadas»: 5.
- **D22 · Los vehículos se leen de la tabla `vehiculos`**, bajo la RLS de quien exporta, y no con `vehiculos_inventario()`: exportar lee el origen
  entero y por la tabla es una pasada; la función corta en 100 y suma la portada. Las dos traen las mismas filas.
- **D23 · Columnas:** `N.º`, los comunes del tipo del origen, los campos activos del layout por orden, `Fase`, `Creado`, `Actualizado`. Sin vitrina,
  lead, creador, portada ni limpieza (lo conservador; se suma sin romper).
- **D24 · Celdas:** el número tal como llega (el precio sin redondear), «Sí»/«No», categoría, fase y opción por nombre, varias opciones con `' | '`
  (el separador de la exportación de leads), fechas con hora en la zona de la empresa. Vacío o tipo que no corresponde: `''`.
- **D25 · El pedido es una unión por `entidad`:** vehículos exige `origen` (guid); leads no lo admite. La base lo vuelve a exigir.
- **D26 · Un origen que no está da 404 `vacia`** sin contar ni registrar: la misma respuesta que uno sin vehículos visibles. Los inactivos sí exportan
  (`getOrigenes(true)`, auditoría del plan).
- **D27 · El archivo:** `vehiculos-<nombre del origen en ASCII>-todos-AAAA-MM-DD.csv` (hasta 40 caracteres; sin nada, el comienzo del id).
- **D28 · `TOPE_POR_ENTIDAD`:** 250.000 para leads y vehículos (medido: conteo 0,3 s y lectura 0,4 s con 250.000); el 409 lleva el de su entidad.
- **D29 · El orden se escribe una vez** (`seguirCon`); cada entidad entra con un `case`.
- **D30 · La medición va aparte** (`medir-datos-exportar-vehiculos.sql`), con 250.000 vehículos sembrados en la transacción.
- **D31 · La prueba SQL va en su archivo** (`exportar-vehiculos.sql`, auditoría del plan), con la papelera y un assert de catálogo: ninguna
  `datos_exportar_*` definer. Es una guarda de regresión: no podía salir en rojo porque la base no cambia.
- **D32 · La fase** se nombra con `leerFasesDeOrigen` (también las jubiladas); nula o desconocida, vacía.
- **El encabezado del precio queda «Precio»**, la etiqueta de `camposComunes()` (el vehículo no lleva moneda por fila); la 9.05-2c decide si su
  `Total (<moneda base>)` se alinea (auditoría del plan, menor).
