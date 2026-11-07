## 2026-11-07 — Pedido del carril persona (estabilizar-2)

- **Lo no obvio:** una espera de 5 s a algo que hace el servidor (el nombre del cliente en la barra, el total del recálculo) no es un tiempo mal puesto: es
  una espera al estado que depende de la latencia. Se prueba inyectando esa latencia (`page.route` sobre `rsc`, `rpc` o las Server Actions): el HEAD cae con la
  misma pantalla que en el CI y lo nuevo no. Frenar la CPU del navegador no alcanzó (0 de 86 a 6× y 16×), porque la caída era del servidor, no de la hidratación
  (la de 4-99, pedido-1).
- **Sí se subió un tiempo, en dos esperas, con la causa medida:** 4-81 y 4-86 pasan a 15 s, el tope que `alDia()` de `soporte/cotizar-vista-previa.ts` ya
  usa para el mismo recálculo. Una espera que no sube nada (4-85) se arregló esperando el estado nuevo, que es la regla de `.claude/rules/e2e.md`.
- **4-82, sin el assert de tiempo entre volúmenes:** los bloques de `vehiculos` por relación ya medían el crecimiento con N y no dependen de un autovacuum; el
  tiempo comparaba dos corridas de una máquina compartida. Se comprobó que sigue mordiendo: la consulta de hoy cae por bloques (`inventario-contra-hoy-1.txt`).
  Lo que pierde: un crecimiento en ms sin crecimiento en bloques de `vehiculos` (por ejemplo, más trabajo de CPU por fila) ya no lo ve esta medición;
  lo acotan los topes absolutos (10, 20 y 40 ms).
