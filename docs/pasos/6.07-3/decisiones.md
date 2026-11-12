## 2026-11-12 — Paso 6.07-3: las lecturas de transporte y aduana

- **D31 · `pagada` se calcula sobre todos los vehículos vivos de la declaración, los vea o no quien mira:** es un hecho de la declaración. `vehiculos` y
  `faltan` cuentan sólo los que ve; `hay_ocultos` dice si hay otros, sin número. Sin vivos, `pagada` es falsa. Lo que se deduce, deliberado: con
  `pagada = false`, `faltan = 0` y `hay_ocultos`, quien mira sabe que a algún vehículo que no ve le falta el tributo (sí o no). `pagada` y `tributo` llegan
  a quien no tiene `logistica.gastos.ver`: es el estado del requisito `aduana.tributos_pagados`, no un monto ni un comprobante. Vivo = en la
  composición: un vehículo de la composición que está en la papelera entra en `pagada` y cuenta como oculto para todos.
- **D32 · Quién lista y lee:** con `logistica.aduana.gestionar`, toda declaración; con `logistica.ver`, la que tiene un vehículo vivo que se ve; sin
  ninguna de las dos, 42501 antes de leer.
- **D33 · Una declaración que no existe y una que no ves dan el mismo P0002.** Con la policy de D41, el select directo tampoco las distingue.
- **D34 · La lista de declaraciones descarta filas del índice** (filtros y visibilidad sin gestionar): la tabla es de volumen bajo y quien la usa a diario
  tiene gestionar. Sin siembra en `db:medir:volumen`; la prueba L4 fija el plan.
- **La lista de declaraciones recorre el índice por lotes de 200 y filtra en plpgsql:** con los filtros en la consulta, el plan genérico los creía
  selectivos y ordenaba toda la tabla.
- **D35 · `transporte_grupos` devuelve `{tipo, grupos, siguiente, cortada}` y mira a lo sumo 2.000 filas por llamada;** cada clave suma al menos 1.
  `cortada` = paró por el recorrido antes de llenar la página (la pantalla ofrece «Seguir buscando»). La lista de declaraciones no tiene ese tope
  (D34): si 6.09 mide que crece, que lo sume con su `cortada`.
- **D36 · Un grupo entra si alguna unidad que se ve cumple todos los filtros;** sus datos salen de las que se ven: el valor si coinciden, si no nulo y
  la clave en `varios`.
- **D37 · La visibilidad de los grupos se resuelve una vez** (orígenes de `logistica.ver`, `repuestos.ver`): equivale a `transporte_grupo`.
- **D38 · El registro en `paginas-en-la-base.ts` lo hace quien llame** (6.08, 6.09): la guarda exige que alguien en `src/` llame a cada RPC registrada.
- **D39 · El prefijo corta por la forma normalizada de la clave y el cursor es opaco:** una clave vieja en minúsculas (de antes de `transporte_guardar`)
  ordena, en ICU, dentro del bloque del prefijo y no corta la búsqueda; el cursor nunca se normaliza (D43). No se normalizan las claves viejas. El
  caso ICU queda razonado, no probado (PGlite ordena en `C`).
- **D40 · Filtros de grupos, lista cerrada:** `naviera`, `puerto_origen`, `puerto_destino`, `en_transito`, `prefijo`; un valor mal escrito, 22023 con la clave.
- **D41 · La policy de leer de `declaraciones_aduana` pasa a la regla de D2:** gestionar, o un vehículo vivo de la declaración que se ve con
  `logistica.ver`. Antes, con `logistica.ver` en cualquier origen un select directo leía toda cabecera. No se revoca el select.
- **D42 · `aplicado_en` de `logistica.aduana.gestionar` suma las lecturas y la policy.** El de `logistica.ver` (`puede_unidad`) no se toca.
- **D43 · El cursor de `transporte_grupos` es el id de una fila de `transportes`, no la clave** (de la auditoría del informe): con `cortada`, la última
  clave mirada podía ser de un grupo con sólo unidades que quien llama no ve, y siguiendo las páginas se recorrían esas claves. La llamada siguiente
  resuelve la clave por la PK; una clave o un id que ya no existe da 22023 `hint = 'cursor'` (la lista vuelve a empezar).
- **Para el coordinador:** filas propuestas para `docs/RENDIMIENTO.md`: «`/logistica/aduana` · `declaraciones_listar` · 50 (máx. 100) ·
  `declaraciones_aduana_creado_idx` · lotes de 200, filtros sobre el orden, volumen bajo» y «`/logistica/embarques` · `transporte_grupos` · 50 (máx. 100) ·
  índices parciales de booking y contenedor · recorrido ≤ 2.000 filas, `cortada`». Las filas de 6.08 y 6.09 suman el registro de D38 y el contrato de
  `transporte_grupos` (`siguiente`, `cortada`, `varios`).
