# El Excel de cotización (referencia de la Fase 4)

Transcripción de `docs/referencias/COTIZACIONES FRANK.xlsx` (el nombre lleva un espacio, no un guion bajo), leída el 2026-10-22 con un
script desechable fuera del repo. Cada fórmula se copió tal cual está, con las compartidas expandidas a su celda. Cada valor es el que el
archivo guarda calculado: es la última vez que se recalculó al guardarlo, el 2026-06-27 (`TODAY()` = 46200). **El `.xlsx` no se
commitea** (`.gitignore`, más abajo): este archivo trae todo lo que el motor necesita para sus pruebas.

El libro tiene tres hojas: «COTIZACIÒN» (con acento grave), «COMIS ASES» y «Amnistia». Hay un nombre definido,
`año_vehiculo` = `COTIZACIÒN!$F$7:$L$7`, que ninguna fórmula usa.

## Funciones que usa

Sólo **`SUM`** (34 veces) y **`TODAY`** (4 veces: `C4`, `G11`, `G47` y `G64`; `G29` es `=+G11`). Además usa `+`, `-`, `*`, `/`,
porcentajes literales (`2%`) y el `=+` inicial de Lotus. **`TODAY()` sólo escribe la fecha en el encabezado de cada cotización: ningún
cálculo la usa.**

## Tipos de cambio (hoja «COTIZACIÒN»)

| Celda     | Concepto       | Valor                           |
| --------- | -------------- | ------------------------------- |
| `B2`/`C2` | TCO (oficial)  | 9,73                            |
| `B3`/`C3` | TCP (paralelo) | 10                              |
| `B4`/`C4` | FECHA          | `=TODAY()` → 46200 (2026-06-27) |

Cada grupo de una cotización tiene su tipo de cambio en la columna K, que copia `C2` o `C3`. **La etiqueta del grupo («Paralelo» en J)
está en la primera fila y el valor (K) en la segunda** en el primer grupo de cada cotización (`J14`/`K15`, `J32`/`K33`, `J50`/`K51`,
`J67`/`K68`). En los grupos siguientes la etiqueta y el valor están en la misma fila.

## Las cuatro cotizaciones

Las columnas son las mismas en las cuatro:

- G: el concepto;
- H: el monto en USD, tipeado o fórmula;
- I: la descripción;
- J: el tipo de cambio que aplica («Paralelo» u «Oficial»), dicho una vez por grupo;
- K: el valor de ese tipo de cambio;
- L: el plazo de pago, por grupo;
- N: el subtotal del grupo en USD;
- O: el subtotal del grupo en Bs.

Los encabezados son «TOTALES», «Tipo $ Cambio», «Plazos Pagos», «Dolares» y «Bolivianos».

### 1. «COTIZACIÓN MOTO EEUU - BOLIVIA» (filas 11–22)

| Fila | Concepto (G)          | H                 | Valor H       | Descripción (I)                                                               | TC (J / K)              | Plazo (L)        | N (USD)                 | O (Bs)                       |
| ---- | --------------------- | ----------------- | ------------- | ----------------------------------------------------------------------------- | ----------------------- | ---------------- | ----------------------- | ---------------------------- |
| 14   | Remate (costo aprox.) | 9500 (tipeado)    | 9500          | Probabilidad de compra en subasta                                             | Paralelo / —            | 2 días           | `=SUM(H14:H16)` → 11232 | `=SUM(H14:H16)*K15` → 112320 |
| 15   | Fees / Tarifa USA     | 1300 (tipeado)    | 1300          | Comisión de subasta USA (aprox.)                                              | — / `=+C3` → 10         |                  |                         |                              |
| 16   | Transferencia a USA   | `=(H14+H15)*0.04` | 432           | Comisión giro 4%                                                              |                         |                  |                         |                              |
| 17   | Grúa                  | 880 (tipeado)     | 880           | Traslado al puerto (USA)                                                      | Paralelo / `=+K15` → 10 | 7 días           | `=SUM(H17:H19)` → 2580  | `=SUM(H17:H19)*K15` → 25800  |
| 18   | Transporte            | 1300 (tipeado)    | 1300          | USA - Chile / Chile - Bolivia (Cbba.)                                         |                         |                  |                         |                              |
| 19   | Comisión              | 400 (tipeado)     | 400           | Servicio de logística                                                         |                         |                  |                         |                              |
| 20   | Nacionalización       | 3098 (tipeado)    | 3098          | Póliza y gastos aduaneros                                                     | Oficial / `=C2` → 9,73  | 4 meses (Aprox.) | `=H20` → 3098           | `=H20*K20` → 30143,54        |
| 22   | TOTAL DÓLARES         | `=O22/K15`        | **16826,354** | Todo con papeles, fuera de Aduana Nacional Cochabamba (No incluye reparación) |                         |                  | `=SUM(N14:N21)` → 16910 | `=SUM(O14:O21)` → 168263,54  |

### 2. «COTIZACIÓN VEHÍCULOS A GASOLINA EEUU - BOL» (filas 29–41; la fecha `G29` es `=+G11`)

| Fila | Concepto                 | H                 | Valor H       | Descripción                                                                   | TC                     | Plazo            | N (USD)                   | O (Bs)                       |
| ---- | ------------------------ | ----------------- | ------------- | ----------------------------------------------------------------------------- | ---------------------- | ---------------- | ------------------------- | ---------------------------- |
| 32   | Remate (costo aprox.)    | 14000             | 14000         | Probabilidad de compra en subasta                                             | Paralelo / —           | 2 días           | `=SUM(H32:H34)` → 16452,8 | `=SUM(H32:H34)*K33` → 164528 |
| 33   | Fees / Tarifa USA        | `=+H32*0.13`      | 1820          | Comisión de subasta USA (aprox.)                                              | — / `=C3` → 10         |                  |                           |                              |
| 34   | Transferencia a USA      | `=(H32+H33)*0.04` | 632,8         | Comisión giro 4%                                                              |                        |                  |                           |                              |
| 35   | Grúa                     | 1300              | 1300          | Traslado al puerto (USA)                                                      | Paralelo / `=K33` → 10 | 7 días           | `=SUM(H35:H38)` → 6100    | `=SUM(H35:H38)*K35` → 61000  |
| 36   | Transporte               | 3600              | 3600          | USA - Chile / Chile - Bolivia Cbba.                                           |                        |                  |                           |                              |
| 37   | Comisión                 | 500               | 500           | Servicio de logística                                                         |                        |                  |                           |                              |
| 38   | Documentacion de ingreso | 700               | 700           | Facturas y documentos de ingreso                                              |                        |                  |                           |                              |
| 39   | Nacionalización          | 21792 (tipeado)   | 21792         | Póliza y gastos aduaneros                                                     | Oficial / `=C2` → 9,73 | 4 meses (Aprox.) | `=H39` → 21792            | `=H39*K39` → 212036,16       |
| 41   | TOTAL DÓLARES            | `=O41/K33`        | **43756,416** | Todo con papeles, fuera de Aduana Nacional Cochabamba (No incluye reparación) |                        |                  | `=SUM(N32:N40)` → 44344,8 | `=SUM(O32:O40)` → 437564,16  |

### 3. «COTIZACIÓN HÍBRIDOS Y ELÉCTRICOS EEUU - BOL» (filas 47–60)

| Fila | Concepto                  | H                 | Valor H     | Descripción                                                                   | TC                     | Plazo            | N (USD)                 | O (Bs)                       |
| ---- | ------------------------- | ----------------- | ----------- | ----------------------------------------------------------------------------- | ---------------------- | ---------------- | ----------------------- | ---------------------------- |
| 50   | Remate (costo aprox.)     | 30000             | 30000       | Probabilidad de compra en subasta                                             | Paralelo / —           | 2 días           | `=SUM(H50:H52)` → 35256 | `=SUM(H50:H52)*K51` → 352560 |
| 51   | Fees / Tarifa USA         | `=+H50*0.13`      | 3900        | Comisión de subasta USA (aprox.)                                              | — / `=C3` → 10         |                  |                         |                              |
| 52   | Transferencia a USA       | `=(H50+H51)*0.04` | 1356        | Comisión giro 4%                                                              |                        |                  |                         |                              |
| 53   | Grúa                      | 1500              | 1500        | Traslado al puerto (USA)                                                      | Paralelo / `=C3` → 10  | 7 días           | `=SUM(H53:H57)` → 6800  | `=SUM(H53:H57)*K51` → 68000  |
| 54   | Export. Hybrid o Electric | 500               | 500         | Trámite en USA                                                                |                        |                  |                         |                              |
| 55   | Transporte                | 3600              | 3600        | USA - Chile / Chile - Bolivia Cbba.                                           |                        |                  |                         |                              |
| 56   | Comisión                  | 500               | 500         | Servicio de logística                                                         |                        |                  |                         |                              |
| 57   | Documentación de ingreso  | 700               | 700         | Facturas y documento de ingreso                                               |                        |                  |                         |                              |
| 58   | Nacionalización           | 20200 (tipeado)   | 20200       | Póliza y gastos aduaneros                                                     | Oficial / `=C2` → 9,73 | 4 meses (Aprox.) | `=H58` → 20200          | `=H58*K58` → 196546          |
| 60   | TOTAL DÓLARES             | `=O60/K51`        | **61710,6** | Todo con papeles, fuera de Aduana Nacional Cochabamba (No incluye reparación) |                        |                  | `=SUM(N50:N59)` → 62256 | `=SUM(O50:O59)` → 617106     |

### 4. «COTIZACIÓN VEHÍCULOS EEUU - CHILE» (filas 64–73)

| Fila | Concepto              | H                 | Valor H     | Descripción                       | TC                    | Plazo  | N (USD)                   | O (Bs)                       |
| ---- | --------------------- | ----------------- | ----------- | --------------------------------- | --------------------- | ------ | ------------------------- | ---------------------------- |
| 67   | Remate (costo aprox.) | 13000             | 13000       | Probabilidad de compra en subasta | Paralelo / —          | 2 días | `=SUM(H67:H69)` → 15277,6 | `=SUM(H67:H69)*K68` → 152776 |
| 68   | Fees / Tarifa USA     | `=+H67*0.13`      | 1690        | Comisión de subasta USA (aprox.)  | — / `=C3` → 10        |        |                           |                              |
| 69   | Transferencia a USA   | `=(H67+H68)*0.04` | 587,6       | Comisión giro 4%                  |                       |        |                           |                              |
| 70   | Grúa                  | 1180              | 1180        | Traslado al puerto (USA)          | Paralelo / `=C3` → 10 | 7 días | `=SUM(H70:H72)` → 4880    | `=SUM(H70:H72)*K68` → 48800  |
| 71   | Transporte            | 3300              | 3300        | USA - Chile                       |                       |        |                           |                              |
| 72   | Comisión              | 400               | 400         | Servicio de logística             |                       |        |                           |                              |
| 73   | TOTAL DÓLARES         | `=O73/K68`        | **20157,6** | No incluye reparación             |                       |        | `=SUM(N65:N72)` → 20157,6 | `=SUM(O65:O72)` → 201576     |

Esta cotización no tiene nacionalización: todo va al paralelo, así que «TOTAL DÓLARES» coincide con la suma de los dólares.

## La calculadora de póliza (hoja «COTIZACIÒN», columnas B a D, filas 7–42)

| Fila | Concepto (C)                                      | D                                                                 | Valor            |
| ---- | ------------------------------------------------- | ----------------------------------------------------------------- | ---------------- |
| 8    | CLASE                                             | «Auto menor a 2000cc» (lista; **su validación apunta a `#REF!`**) |                  |
| 9    | AÑO DEL VEHICULO                                  | 2017 (validación: lista `$Z$3`, que vale 2013)                    |                  |
| 10   | VALOR TABLA (FOB o MSRP)                          | 53900                                                             |                  |
| 11   | FACTOR DP GASOLINA                                | **0,8 tipeado** (no lo busca en la tabla de la fila 8)            |                  |
| 17   | VALOR FOB                                         | `=D11*D10`                                                        | 43120            |
| 18   | SEGURO                                            | `=D17*0.02`                                                       | 862,4            |
| 19   | FLETE I Y II                                      | 900                                                               |                  |
| 20   | GTO.PTO.                                          | 35                                                                |                  |
| 21   | GTO.TALLER                                        | 200                                                               |                  |
| 22   | UTILIDAD                                          | 20                                                                |                  |
| 23   | VALOR CIF                                         | `=SUM(D17:D22)`                                                   | 45137,4          |
| 25   | Gravamen Arancelario (G. A.), tasa en `B25` = 0,1 | `=D23*B25`                                                        | 4513,74          |
| 26   | al Valor Agregado (I. V. A.), `B26` = 0,1494      | `=(D23+D25)*B26`                                                  | 7417,880316      |
| 27   | al Consumo Específico (I. C. E.), `B27` = 0,15    | `=(D23+D25)*B27`                                                  | 7447,671         |
| 29   | TOTAL IMPUESTO SUS                                | `=SUM(D25:D27)`                                                   | 19379,291316     |
| 30   | Factura de Taller                                 | 100                                                               |                  |
| 31   | Almacenaje                                        | 0                                                                 |                  |
| 32   | (en D, como texto) «Gtos. Agencia + gtos.»        |                                                                   |                  |
| 35   | TOTAL GASTOS                                      | `=SUM(D29:D32)`                                                   | 19479,291316     |
| 36   | AGENCIA                                           | 150                                                               |                  |
| 37   | GAS,SAO                                           | 70                                                                |                  |
| 38   | FACTURA DE VENTA                                  | 300                                                               |                  |
| 39   | ALMACENAJE                                        | 160                                                               |                  |
| 41   | TOTAL USD                                         | `=SUM(D35:D40)`                                                   | **20159,291316** |
| 42   | (en D) «PÓLIZA»                                   |                                                                   |                  |

**La calculadora no está conectada a ninguna cotización.** La nacionalización de la de gasolina (`H39` = 21792) está tipeada y no es
`D41` (20159,29). Lo mismo pasa con las de la moto y la híbrida.

## Tablas de referencia

**Depreciación** (fila 7: año, fila 8: «Auto menor a 2000cc»; la columna K está vacía en las tres filas):

| Año    | 2018  | 2019  | 2020  | 2021  | 2022 | 2023  | 2024 | 2025 | 2026 |
| ------ | ----- | ----- | ----- | ----- | ---- | ----- | ---- | ---- | ---- |
| Factor | 0,328 | 0,328 | 0,328 | 0,328 | 0,41 | 0,512 | 0,64 | 0,8  | 1    |

**«ICE MOTOS»** (fila 5, con los mismos años de la fila 7): 30, 30, 30, 30, 30, 25, 20, 10 y 5. Están escritos como enteros, sin `%`, y
ninguna fórmula los usa.

**Fila suelta `Z3:AF3`:** 2013, 0, 0, 0, 0, 0 y 0,3. Es la lista de la validación del año (sólo se usa `Z3`); el resto no tiene
etiqueta.

**Transporte USA–Bolivia** (`R9:V18`: puertos New Jersey - NY, Miami - FL y Houston - TX, sin un precio por puerto):

| Tipo de vehículo               | Oficina | Cliente |
| ------------------------------ | ------- | ------- |
| Autos                          | 2700    | 3000    |
| Vagonetas Medianas o Crossover | 3300    | 3600    |
| Vagonetas Grandes              | 3400    | 3700    |
| Camionetas Medianas            | 3400    | 3700    |
| Camionetas Grandes             | 3700    | 4000    |
| UTV o Terix                    | 2700    | 3000    |
| ATV o Cuadratrack              | X       | X       |
| Motos                          | X       | X       |

**Transporte USA–Chile** (`R22:V31`, los mismos puertos): Autos 2400 / 2700; Vagonetas Medianas o Crossover 3000 / 3300; Vagonetas
Grandes 3100 / 3400; Camionetas Medianas 3100 / 3400; Camionetas Grandes 3400 / 3700; UTV o Terix 2400 / 2700; ATV y Motos «X».

Ninguna fórmula lee las tablas de transporte: el «Transporte» de cada cotización está tipeado. La moto tipea 1300, aunque la tabla dice
«X» para motos.

**«COMIS ASES»** (comisión del asesor): Motocicleta 100, Automóvil 200, Vagoneta Mediana 250, Vagoneta Grande 300 y Camioneta 350.
Ninguna fórmula la usa: la «Comisión» de cada cotización es el servicio de logística (400 o 500), no esta tabla.

**«Amnistia»** (multa por amnistía; un ejemplo con una Nissan Serena 2009 de 1997 cc, en vagoneta):

|                                                        | Gasolina (columna C)               | Gas (columna H)                    |
| ------------------------------------------------------ | ---------------------------------- | ---------------------------------- |
| Valor tabla                                            | `C12` = 27711                      | (el mismo `C12`)                   |
| Factor DP                                              | `C13` = 0,512 (tipeado)            | `C14` = 0,41 (tipeado)             |
| Valor FOB                                              | `=C12*C13` → 14188,032             | `=(C12*C14)` → 11361,51            |
| Seguro                                                 | `=C18*2%` → 283,76064              | `=H18*2%` → 227,2302               |
| Flete I y II, Gto. puerto, Utilidad                    | 0, 0, 0                            | `=C20`, `=C21`, `=C23` → 0         |
| Gto. gas                                               | `C22` = 0                          | `H22` = 0 (tipeado, no `=C22`)     |
| Valor CIF                                              | `=SUM(C18:C23)` → 14471,79264      | `=SUM(H18:H23)` → 11588,7402       |
| GA (0,1)                                               | `=C24*B26` → 1447,179264           | `=H24*G26` → 1158,87402            |
| IVA (0,1494)                                           | `=(C24+C26)*B27` → 2378,2944024576 | `=(H24+H26)*G27` → 1904,493564468  |
| ICE (**0,1**)                                          | `=(C24+C26)*B28` → 1591,8971904    | `=(H24+H26)*G28` → 1274,761422     |
| Total impuesto                                         | `=SUM(C26:C28)` → 5417,3708568576  | `=SUM(H26:H28)` → 4338,129006468   |
| Factura de taller / Tanque de gas, almacenaje, agencia | 50, 0, 0                           | 0, 0, 0                            |
| Total gastos                                           | `=SUM(C30:C33)` → 5467,3708568576  | `=SUM(H30:H33)` → 4338,129006468   |
| **Multa**                                              | `=(1.5*C35)` → **8201,0562852864** | `=(1.25*H35)` → **5422,661258085** |

Tabla de factores de la hoja (años 2006 a 2011): gasolina 0,328, 0,41, 0,512, 0,64, 0,8 y 1; gas 0,328, 0,328, 0,41, 0,512, 0,64 y
0,8. **Los factores tipeados no son los de su año en esa tabla:** para 2009 serían 0,64 (gasolina) y 0,512 (gas), y el ejemplo usa
0,512 y 0,41, que son los de 2008. No lo corrijo: es lo que dice el archivo, y la regla del negocio la tiene que confirmar la persona.

## Defectos del archivo

1. **La validación de `D8` («CLASE») apunta a `#REF!`**: la lista de clases se borró.
2. **Tres subtotales en Bs toman el tipo de cambio de otro grupo:**
   - `O17` usa `K15` en vez de `K17`;
   - `O53` usa `K51` en vez de `K53`;
   - `O70` usa `K68` en vez de `K70`.

   Hoy no cambian el resultado (todos valen `C3`), pero si un grupo cambiara de tipo de cambio, el total quedaría mal sin avisar. La de
   gasolina (`O35` usa `K35`) es la única bien escrita.

3. **El año 2017 de `D9` no existe en la tabla de depreciación**, que empieza en 2018, y su validación sólo ofrece 2013.
4. **Constantes dentro de las fórmulas:**
   - 4 % de giro (`0.04`), 13 % de fees (`0.13`), 2 % de seguro (`0.02`, `2%`);
   - las multas de 1,5 y 1,25;
   - el ICE de la póliza es 15 % y el de «Amnistia», 10 %.

   El ICE de cada hoja es un número suelto, no una tabla.

5. **Las tablas de transporte, «COMIS ASES», «ICE MOTOS» y `año_vehiculo` no las usa ninguna fórmula**, y la calculadora de póliza no
   alimenta la nacionalización: lo que debería ser búsqueda o cálculo se tipea a mano.
6. Las sumas de los totales incluyen las filas de encabezado: `N73` = `SUM(N65:N72)` suma también el texto «Dolares». `SUM` ignora el
   texto, así que el resultado no cambia.

## Lo que el motor tiene que poder expresar

1. **Varios tipos de cambio en una misma fórmula** (oficial y paralelo), elegidos **por grupo**, con su valor congelado al cotizar.
2. **Grupos con subtotal en las dos monedas:** el subtotal en USD es la suma de las filas; el subtotal en Bs es esa suma por el tipo de
   cambio del grupo. Cada grupo tiene su **plazo de pago** como texto («2 días», «7 días», «4 meses (Aprox.)»). Una fila también tiene
   su descripción.
3. **El «TOTAL DÓLARES» es el total en Bs ÷ el paralelo, no la suma de los dólares.** Lo confirma el archivo: 16826,354 contra 16910
   (moto), 43756,416 contra 44344,8 (gasolina) y 61710,6 contra 62256 (híbridos). Sólo coinciden cuando no hay grupo al oficial
   (EE. UU.–Chile, 20157,6). Los dos totales se ven, y el que manda es el de Bs ÷ paralelo.
4. **Valores tipeados que en el negocio son sugeridos:**
   - la **nacionalización** (tipeada en las tres cotizaciones a Bolivia, aunque la calculadora de póliza la sabe calcular);
   - el **factor de depreciación** (`D11` y los de «Amnistia», tipeados aunque la tabla existe);
   - el **transporte** (tipeado, aunque la tabla existe).

   El motor los sugiere (de una tabla o de un cálculo) y el asesor los sobrescribe: quedan «modificados».

5. **Porcentajes encadenados sobre sumas parciales:** fees = remate × 13 %, giro = (remate + fees) × 4 %, IVA = (CIF + GA) × 14,94 %,
   ICE = (CIF + GA) × tasa.
6. **Una fila que cambia con el tipo de vehículo:** la híbrida suma «Export. Hybrid o Electric» 500, y la moto no tiene «Documentación
   de ingreso».
7. **Cálculos que no son cotización** (la calculadora de póliza, la multa de amnistía) con la misma forma: búsqueda por año, CIF,
   impuestos en cascada y un multiplicador final.
8. **La fecha de la cotización** (`TODAY()`) es un dato del encabezado, congelado al guardar; no entra al cálculo.
9. **Sin referencias A1 ni funciones fuera de `SUM` y `TODAY`:** lo que el archivo hace con `SUM(H14:H16)` es «la suma del grupo», no
   un rango de celdas.
