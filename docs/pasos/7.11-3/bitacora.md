## 2026-11-12 · Paso 7.11-3: los rojos del CI del 7.11 (arreglo, sin parte nueva)

### Hecho

El e2e completo del CI (corrida 43258979924) cayó en tres pruebas de escritorio por la burbuja y el contador del chat, que ahora viven en el marco de toda pantalla:

- `cotizaciones-listado-resumen` (R1) y `vehiculos-resumen` (un pedido a la base) cuentan pedidos a `/rest/v1/`: `chat_no_leidos` entró en la cuenta. `e2e/soporte/pedidos-del-marco.ts` › `esDelMarco` lo deja fuera, igual que a `notificaciones`.
- `configuracion-cotizacion-niveles-200`: al 200 % «5 de 10 niveles posibles.» queda al final de la página bajo la burbuja (`fixed`, abajo a la derecha). `textosQueNoSeVenEnteros` no cuenta a la burbuja como lo que tapa.
- `buscador` (Ctrl+K) pasó al reintentar: inestable de arranque en frío, no es del 7.11 ni un abierto (`.claude/rules/e2e.md`).

### Verificación

- e2e escritorio de los tres specs, 14 en verde (`.piloto/salidas/7.11/e2e-ci-fix.log`). Sin SQL ni interfaz tocada: sólo `e2e/`.

e2e completo: no (7.11-3, arreglo de specs; lo prueba el CI del PR; dirigidos: configuracion-cotizacion-niveles-200, cotizaciones-listado-resumen, vehiculos-resumen)
