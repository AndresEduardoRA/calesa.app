## 6.12-1 — Alertas y bandeja de logística: la base (2026-11-12)

- **D1 · «Trabado»:** una unidad **demorada** a la que le falta al menos un requisito **bloqueante** para entrar a su fase siguiente (la activa de menor
  `fases.orden` entre las que tienen transición desde la suya); se evalúan sólo las primeras 50 demoradas que ve quien mira. Sin transición de salida no
  está trabada. El motivo es la descripción del primer requisito incumplido por `fases_requisitos (orden, id)`. Cierra el abierto «Trabado no está definido».
- **D2 · A quién se avisa la demora:** a quien tiene `flujos.mover`, `logistica.ver` y `vehiculos.ver` del origen; manda el menor alcance de las tres (con
  `propios`, la unidad que creó o la de un lead de su cartera). Nadie recibe un aviso de lo que no puede abrir. Quien está en una baja en curso deja de contar
  su cartera.
- **D3 · Cada cuánto:** `alertas-demora` cada hora en el minuto 12; `alerta_cada_horas` nulo = 72 h. `documentos-vencimientos` a las 11:15 UTC (07:15 en
  America/La_Paz).
- **D4 · Reabrir** es la misma fila (el antispam deja una abierta por persona, tipo y unidad): sin leer, `creado_en = now()`, título y cuerpo al día. El
  primer aviso es un insert y ya empuja si `push_web` está activa (`trg_notificaciones_push`, 7.03); reabrir es un update y no empuja.
- **D5 · Después de accionada** (abrir un `demora_fase` lo acciona): no se avisa de nuevo hasta pasado `alerta_cada_horas` desde el último aviso de la
  fase actual; uno anterior a `fase_desde` no cuenta.
- **D6 · Vencimientos:** sólo documentos de vehículos (los de repuestos, Fase 8) que todavía no vencieron (`vence_el >= hoy`, el día de la empresa);
  una vez por persona y documento desde que empieza su ventana (`vence_el - aviso_dias`, medianoche de la empresa): si alguien corre la fecha y la ventana
  vuelve a abrirse, avisa otra vez. Destinatarios: `logistica.documentos.subir` del origen con la regla de D2. Con `aviso_dias` mayor que 90, la purga diaria
  puede borrar el aviso leído y se avisa dos veces: se acepta.
- **D7 · Textos** (en la base): `Vehículo demorado en «<fase>»` / `<título> lleva <N> días en la fase (el límite es <D>)`; `Documento por vencer:
«<tipo>»` / `<título> · vence el <d> <mes> <aaaa>.` más `Sube el nuevo para renovarlo.` o `Pide uno nuevo antes de que venza.`. El mes sale de un
  arreglo fijo, no de `lc_time`. Ruta: `/logistica/vehiculo/<id>`.
- **D8 · Las pruebas de los jobs** van en `supabase/tests/areas/alertas/jobs.sql`, no en `supabase/tests/jobs.sql` (ése es de los jobs de funciones edge).
- **D9 · Sin candado en el job:** si alguien mueve la unidad mientras corre, puede quedar abierto un aviso de la fase anterior; se cierra al abrirlo o al
  volver a moverla. Hacer esperar a quien mueve sería peor. Para achicar la ventana, cada escritura vuelve a pedir que la unidad siga en esa fase con ese
  `fase_desde`.
- **D10 · Índice nuevo** `notificaciones_referencia_idx`: «ya avisé» y «cerrar al mover» buscan por unidad o documento y el antispam empieza por
  `usuario_id`. Con él el paso es Nivel 2: el e2e completo lo corre el CI del PR.
- **D11 · Topes por corrida:** 2.000 unidades y 2.000 documentos, de a 200 por cursor. Con más de 2.000 demoradas a la vez, las más nuevas esperan.
- **D12 · Sin `medir-*.sql`:** rangos acotados de índices ya medidos (`vehiculos_cadena_idx`, 6.02), una cola corta y jobs con tope.
- **D13 · Firma:** `alertas_demora()` conserva `returns integer`: cuántos avisos intentó (la puerta de 7.01 puede descartar en silencio).
- **D14 · Orígenes de la bandeja:** todos los que la persona ve, activos o no. «Por aprobar» lista sólo documentos de vehículos (los de repuestos, 8.05).
- **D15 · La papelera no cierra avisos abiertos:** la unidad borrada ya no alerta; el aviso viejo muere al abrirlo o con la purga.
