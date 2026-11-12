## 2026-11-12 — 7.10-1

Plan: `.piloto/planes/7.10.md`. Las no mencionadas se cumplieron tal cual (D5, D8 y D9 son de las partes 2 y 3).

- **D1** — El 7.10 se parte en tres partes que cierran solas: leer y dibujar (esta), el selector `#`, y `/tarea` y `/evento`. En el e2e de esta parte la mención se siembra por SQL.
- **D2 (desviación de la fila)** — El drawer de la mención es **propio del chat**: muestra lo ya leído y un enlace «Abrir en Leads|Vehículos|Cotizaciones». No reusa `DrawerDeLead`, `ResumenDeVehiculo` ni `ResumenDeCotizacion`: ninguno sale por `client.ts` y
  se montan con las filas, orígenes y permisos que trae la página de su lista. Reversible: se cambia el cuerpo del drawer sin tocar la URL ni el parser.
- **D3** — «Eliminado» sólo cuando se sabe (la fila vino con `eliminado_en` o la FK de la ficha quedó nula). Un lead purgado, para quien no lo ve, se lee «No tienes acceso…»: decirlo distinto filtraría existencia sin una función `security definer`.
- **D4** — El chip de persona no abre drawer (sólo hay un nombre); `?mencion=usuario:<id>` se limpia como un valor ilegible. Reversible con «Escribirle por chat» (7.11).
- **D6** — La interfaz no envía fichas de lead, vehículo o cotización; si llega una (otro cliente), se dibuja como mención.
- **D7** — La edición de un mensaje con menciones no cambia en esta parte; 7.10-2 manda `menciones` también al editar.
- **D10 (ajuste)** — Un chip «No tienes acceso…» o «Eliminado» (de lead, vehículo o cotización) es un botón que abre el drawer, que dice lo mismo sin ningún dato ni enlace (así el clic de la fila del plan es alcanzable). La persona sin acceso es texto.
- **D11 (ajuste)** — La mención abierta por una URL pegada (que el hilo no leyó) se pide con la misma lectura de una referencia (`adicional` de `useReferenciasDelHilo`, memorizada por el texto de la URL para no repetirla en cada dibujo).
