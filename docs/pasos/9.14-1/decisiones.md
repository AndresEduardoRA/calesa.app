# 9.14-1 · El cierre de la Fase 9, parte 1 de 3: las cuatro tareas de oro (2026-11-13)

- **D1 · (Duda 1 de la fila 9.14.) La fase cierra «lista para desplegar»**, no desplegada: el piloto no toca producción y la puerta de una fase
  es el CI (`docs/PILOTO.md`). Lo escribe la 9.14-3 en PLAN y en ESTADO, con el guion en seco del 9.13 en verde y la lista de la persona entregada.
- **D2 · (Duda 2 de la fila.) Las metas en segundos se afirman con KLM y teclas o toques contados**, como ya hacía la tarea 2, no con el reloj del
  robot: con tres carriles en una máquina un cronómetro da rojos falsos. El tiempo del robot se anota, pero sólo como tope generoso.
- **D3 · Tres partes.** Las tareas de oro (medir y lo que falte), el recorrido con dos cuentas, y el Nivel 3 con los docs de cierre, que corre una
  sola vez sobre el SHA que ya tiene todo lo anterior.
- **D4 · De la tarea 1 sale del celular-excluido sólo la prueba de la meta.** La fila pide la meta en los dos proyectos; los «nunca» (teléfono
  ajeno, perder lo tipeado) basta con afirmarlos una vez, y sus marcas `@sin-celular`, demostradas en el 5a-fix-3, se quedan: son minutos del
  completo de celular que no compran nada.
- **D5 · El «nunca» de la tarea 4 se prueba con un e2e, no con una prueba SQL.** Lo que promete UX es que la persona se entere: la prueba mira
  donde la asesora lo ve (la tarjeta «Vencido» en Inicio y el aviso en `/notificaciones`), y de paso afirma la fila de `notificaciones` como
  respaldo. La función se llama por `sql()` como `postgres`, igual que la llama el job de cron, y la prueba borra lo que crea.
- **D6 · El marcador de la bitácora va en una sola línea:** partido en dos, `scripts/piloto/cuenta-e2e.mjs` no lo reconoce (se ve en los cinco
  «no reconocidos» que dejó el 9.12).
- **D7 · La tabla de las tareas vive en PLAN › «Fase 9» como sección propia** y la tabla de criterios de la 9.14-3 la cita en su primera fila,
  en vez de repetir los mismos números en dos lugares.
