## 2026-11-11 — Paso 5.06-1

- **D1 · Una sola sección:** «Quién puede mover a esta fase» arriba (sólo lectura en la parte 1) y la lista de salidas debajo.
- **D2 · «Salida de una fase»** entra al glosario; en código sigue `transicion`.
- **D3 · El hueco `bloques.salidas` recibe `roles`** y el inspector los pasa: `flujos` no importa `equipo`. Con el hueco lleno ya no se dibuja `LecturaDeSalidas`.
- **D4 · Alta en línea con estado local;** sólo quitar vive en la URL (`?eliminar=salida&salida=<id>`). Reversible si la persona prefiere URL.
- **D5 · Destinos:** fases activas, distintas de la propia y que aún no son salida; sin ninguna, el botón se apaga con su motivo.
- **D6 · Acción vacía = «Mover»** (la base la guarda nula); máximo 40 caracteres.
- **D7 · Chips:** uno por salida en la fila, hasta 3 y «+N más»; texto con el color de la fase destino, no enlaces.
- **D9 · «Entradas»:** sólo lectura.
- **D10 · El id del intento se reutiliza al reintentar;** «ya existe» sobre el campo `id` se toma por hecho (sobre `a_fase_id` es un error de destino repetido y va junto a su campo).
- **Constantes de la URL de quitar** en `entities/transiciones/vista-de-salidas.ts`: `confirmar-con-url.test.ts` pidió sólo que el hook que abre nombre `PANEL_ELIMINAR_SALIDA` (lo hace por su `import`), no hizo falta declararla dentro.
- **Clave `eliminar` compartida** con requisitos y agenda: conviven (cada hook abre con su valor); el e2e recorre quitar una salida con el inspector abierto y pasa.
