# 9.05-2c · Datos: exportar las cotizaciones (2026-11-12)

- **D33 · Las cotizaciones se leen de la tabla `cotizaciones`**, bajo la RLS de quien exporta, y no de `cotizaciones_listado()`: la función es plpgsql
  (PostgREST no le empuja rango ni límite) y corta en 100 (2.500 llamadas contra 250). **Se aparta de la letra de la fila 9.05** («la cabecera que
  entrega `cotizaciones_listado()`»), no de su conducta: «total visible» es `total_base`, lo mismo que da la RPC; sin función definer nueva.
- **D34 · Columnas:** `N.º`, `Título`, `Cliente`, `Vehículo`, `Origen`, `Clase`, `Estado`, `Total (<moneda base>)`, `Creado`, `Actualizado`. **También se
  aparta de la fila:** sin `Vence el` ni «vencida» (se calculan con la vigencia de hoy, no se guardan) ni `moneda_mostrar` (sin término en el glosario).
  Se suman después sin romper.
- **D35 · Celdas:** número y total tal como llegan; «Preventa»/«Final» (las palabras de `ETIQUETA_DE_CLASE` de `cotizaciones`, que no sale por su entrada)
  y «Activa»/«Reportada»/«Inválida», en `Record` exhaustivos sobre los enums; lo nulo o lo que no llega, `''`; fechas en la zona de la empresa.
- **D36 · El encabezado del total es `Total (<moneda base>)`** con la moneda de los ajustes (`Total` si no se leen). El «Precio» de vehículos no se toca.
- **D37 · Los nombres se traen por página y se olvidan en la siguiente**, con el cliente del flujo: clientes por `leads_vista_por_ids` sólo con
  `leads.ver`; títulos de `vehiculos` de a 100 (un GET con `.in`).
- **D38 · `origen` es optativo en cotizaciones:** con él, su etiqueta va en el nombre del archivo; uno que no está da 404 `vacia` sin contar ni registrar.
- **D39 · `TOPE_POR_ENTIDAD.cotizaciones` queda en 250.000** (`TOPE_DE_FILAS`): la exportación entera con nombres se estima en 2,6 s de base (más
  ≈ 2.500 viajes de PostgREST, unos 25 s a 10 ms cada uno), lejos de 150 s.
- **D40 · La medición va aparte** (`medir-datos-exportar-cotizaciones.sql`), con 200.000 sembradas en la transacción sobre las 50.000 de la siembra.
- **D41 · La prueba SQL va en su archivo** (`areas/datos/exportar-cotizaciones.sql`), guarda de regresión; suma un lead de la cartera de Bea para
  recorrer `en_cartera`.
- **D42 · Sin migración, función, policy ni grant.**
- **D43 · El filtro `eliminado_en is null` va explícito** en la lectura (auditoría del plan): `eliminado_en` tiene grant y así el índice parcial no
  depende de que el planificador lo deduzca de la policy.
