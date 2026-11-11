## 2026-11-11 — Paso 7.01-2: los avisos de cartera y de limpieza

- **D1 · Ningún aviso nombra al lead** (ni teléfono, ni número, ni nombre): un lead puede llamarse como su teléfono (alta desde un mensaje), el texto viaja
  por Realtime y el aviso queda después de que le quiten el acceso. Dice «<quien> te compartió/transfirió un lead» y se abre por la `ruta` (`/leads/<id>`).
  Sumar el nombre es una línea.
- **D2 · La limpieza avisa al creador del vehículo, 3 días antes:** ya anotada en la 7.01-1 (la recomendada de la fila).
- **D3 · Repetir reemplaza el aviso abierto:** volver a compartir tras quitar el acceso, o transferir A→B→A→B, borra el aviso sin accionar de antes y deja
  uno nuevo (si no, el antispam se lo tragaría). Como estos avisos no piden acción y 7.02 marca leída al abrir, `accionada_en` casi siempre queda nulo:
  en la práctica se borra también el anterior ya leído, y lo reemplaza uno igual y más nuevo. Se acepta (sellar `accionada_en` dejaría dos iguales).
- **D4 · La marca de «ya avisado» de la limpieza es una tabla propia** (`limpieza_avisos`): una columna en `vehiculos` movería `actualizado_en` (PT409 a quien
  tiene la ficha abierta) y escribiría en `actividad`; un `exists` sobre `notificaciones` se pierde cuando la persona borra el aviso o lo purga la purga.
- **D5 · Una vez por vehículo, para siempre:** ni quitar «Conservar» ni restaurar de la papelera vuelven a avisar. Límite conocido; la marca guarda la fecha
  avisada para poder cambiar la regla sin migrar datos.
- **D6 · Sólo avisa al destinatario:** al saliente de una transferencia (queda compartido), a quien transfiere, a quien quita el acceso o a quien sale, no.
- **D7 · `lead_compartido` y `lead_transferido` sin acción** (`requiere_accion = false`): informan; no hay botón que los resuelva.
- **D8 · `limpieza_pronto` con acción:** pide decidir «Conservar». Al accionarse se libera el antispam, pero manda la marca (D4).
- **D9 · No se toca quién puede conservar ni restaurar:** si el creador ya no puede editar el vehículo, igual se le avisa (lo conservador).
- **D10 · La ficha de `vehiculos` no cambia:** el aviso lo documenta la de `notificaciones` y el GLOSARIO.
- **D11 · La ventana se repite en SQL** (`_limpieza_ventana_de_aviso()` = 3), atada a `VENTANA_DE_AVISO_DIAS` por comentarios en los dos lados; la prueba L1
  fija el borde (hoy + 3 avisa, hoy + 4 no).
- **D12 · Un vencido pendiente también avisa, una vez:** su fecha cae en hoy o mañana (`greatest(vence, proxima)`), que es cuando se va.
- **D13 · Job propio y diario** (`limpieza-avisar`, 13:15 UTC, ≈ 09:15 en La Paz): `limpieza_automatica_correr` devuelve temprano (`temprano`, `ya_corrio`) y
  recrearla para avisar era más riesgo.
- **D14 · Un aviso por vehículo, no agrupado por creador** (la fila: «una vez por vehículo»), con tope de 200 por corrida. Agrupar, si resulta ruidoso, es de
  7.02/7.03.
- **D15 · El cuerpo de `limpieza_pronto` no lleva la fecha:** una fecha visible se formatea con `fechas.ts`, no con `to_char` en SQL; la ficha, a la que lleva
  la `ruta`, ya dice «Se limpia el dd/mm». (El plan la ponía en el cuerpo.)
- **D16 · Sin tope de filas revisadas en `limpieza_avisar()`:** cada día recorre, por `vehiculos_limpieza_orden_idx` y con cota superior, los retenidos por
  ancla y los ya avisados (saltados por PK), como la corrida nocturna recorre los retenidos. Límite conocido: si crecen, el arreglo es una cota inferior o
  un índice parcial (sin `limpieza_avisos`).
