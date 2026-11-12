## 2026-11-12 · Decisiones del paso 8.12-2 (Configuración › Repuestos › «Cotizador»)

- **D18 · Los dos `check` se validan sólo si ninguna fila los rompe** (`repuestos_tramos_logistica_signo_check` y `repuestos_cotizador_config_redondeo_check`):
  si las hay, quedan `not valid` (igual protegen lo nuevo), la migración avisa con `raise notice` y no falla en un despliegue con datos viejos.
- **D19 · El recargo local se tipea en % con dos decimales y se guarda como fracción con cuatro:** es el mismo entero (`'10'` → `'0.1000'`), sin redondeo ni `float`.
- **D20 · Los decimales de la configuración viajan como texto canónico** (`'1.3500'`): se leen con `::text`, el formulario los lee con el lector único de
  números tipeados (`leerNumeroTipeado`: el decimal es el del locale y el otro separador sólo agrupa de a 3) y arma el texto exacto con enteros a escala fija; la
  action lo vuelve a validar con `decimalCanonico`. `Number` sólo para dibujar con `<Monto>` y para el JSON del `insert`/`update`: los topes de pantalla dejan a
  lo sumo 15 cifras (montos ≤ 999 999 999 999,99), que la forma más corta del JSON escribe igual y la base lee exacta. Auditoría del plan, objeción 1: aceptar
  `,` o `.` como decimal sin mirar el locale guardaba «2.000» como 2,00 en es-BO.
- **D21 · Tramos y cajas no se borran desde la pantalla: se desactivan.** El snapshot de una cotización guarda lo que se usó; borrar no da nada y no se deshace.
- **D22 · El historial no dice quién publicó** (se puede sumar leyendo `creado_por`); dice cuándo y con qué valores.
- **D23 · Publicar compara la vigente que se vio con la última antes de insertar** (chequeo de buena fe, no atómico): la tabla es append-only y una carrera deja
  dos filas visibles en el historial; no se pierde nada.
- **D24 · La moneda de un tramo o de una caja no cambia al editar:** se desactiva y se agrega en la otra.
- **D25 · Tramos y cajas no tienen versión: gana la última escritura** (configuración de decenas de filas, una persona a la vez).
- **D26 · El redondeo se dibuja como monto sólo si hay una sola moneda activa;** con varias, como número (vale para todas las monedas del cotizador).
- **D27 · El e2e usa tramos de 900 000 en adelante** y los limpia por rango; la configuración que publica una cuenta de prueba la borra `borrarPersonasDePrueba()`
  (la FK de `creado_por` no tiene `on delete` y la tabla es append-only para la app; ninguna cotización la referencia).
- **D28 · Configuración, tramos y cajas siguen bajo RLS, sin RPC:** no otorgan permisos, la configuración es append-only con `creado_por` verificado por la
  policy y el solape lo cuida el trigger de 8.12-1. «Quitar escrituras directas» (Riesgos de la Fase 8) queda cerrado para el cotizador.
- **D29 · Los modales de tramo y caja viven en la URL** (`?panel=tramo&tramo=<id|nuevo>&moneda=` y lo mismo con `caja`), como todo modal (`ui.md`): uno nuevo
  pide una moneda activa y uno que se edita, estar en lo leído; si no, no abre.
