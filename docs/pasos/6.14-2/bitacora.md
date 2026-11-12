## 6.14-2 · El cierre de la Fase 6: el Nivel 3 y los docs de cierre (2026-11-12)

Parte 2 de 2: cierra la fase. La tarea de oro 3 y el recorrido de la IA son del 6.14-1.

- **Nivel 3**, por proyecto y desde `db:reset` y `db:carreras` (16,4 s y 18,1 s), los dos sobre `225b1c99` (la unión con main): escritorio 1.191 en verde,
  16 saltadas, 0 caídas, 49,1 min (51,1 de reloj); celular 834 en verde, 27 saltadas, 0 caídas, 38,1 min (39,2 de reloj). Sin triaje: ninguna caída.
  5a-4b: 90,3 min de reloj (76,6 en el 5.13-1). `db:probar` 1.343 ✓ y 0 caídas; `db:lint` sin errores (59 avisos y 69 «extra» en 35 funciones);
  `mapa.sh --check` en verde.
- **PLAN, Fase 6:** «Tabla de criterios» (17 criterios con su spec y título, o su archivo SQL, sus proyectos y su resultado) y «Cierre de la Fase 6»; la
  «Partición» marcada (cada fila «hecho el …» con sus docs de paso; total: 14 pasos y 40 partes); dos riesgos anotados como resueltos («Trabado» en el 6.12;
  6-2 y 6-3).
- **Abiertos:** 6-1 y 6-3 cerrados; nace «Los decide la persona» con **6-4**, **6-2**, **6-5**, **6-6** y **6-7** (el «6-3» de las notas del 6.04,
  renumerado porque 6-3 era `pago_anular`).
- **Fichas:** `logistica` (la fase cerrada y lo que deja; 6-3 → 6-7 en las notas; dos líneas duplicadas de «Tablas» fuera) y `flujos` (la Fase 6 cerrada).
  `tablero`, al día desde el 6.12-2.
- **UX:** la tarea de oro 3 nombra su spec; el Flujo 3 dice el conflicto y el lote como quedaron («Marcar que llegó» desde el resumen del contenedor).
- **ESTADO:** la Fase 6 en «Funcionando», con la tarea de oro 3; la fase actual, 7 a 9; el último completo; salen de «Pendientes» la versión de la ficha al
  mover y la papelera con `documentos`, y de «Deuda» los permisos que ya tienen enforcement (`logistica.pagos.confirmar`, `tablero.metricas.ver`,
  `notificaciones.push`).
- e2e completo: sí (6.14-2, cierre, Nivel 3: escritorio 1191 en verde, 16 saltadas, 0 caídas, 49,1 min; movil 834 en verde, 27 saltadas, 0 caídas, 38,1 min)
