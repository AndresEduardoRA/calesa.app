## 2026-11-12 — 7.09-4

Siguen la numeración de la parte 3 (llegó a D31). Plan: `.piloto/planes/7.09-4.md`. Las no mencionadas se cumplieron tal cual.

- **D32 (cambiada)** — `Mensaje.responde: CitaDeMensaje | null`, campo requerido. **Pero la cita no sale del embed** `responde:mensajes!…`: sobre `mensajes → mensajes` PostgREST da 400 con el nombre de la FK y un arreglo
  con la columna. Se lee en una segunda consulta por pk (`conSusCitas`, ≤ 21 ids, sólo con respuestas); si falla o la RLS no deja ver el original, queda sin cita y la burbuja dice «Mensaje no disponible».
- **D33** — Las reglas van en `entities/reglas-del-mensaje.ts`, no en `mensajes.ts`. Los tests de la cita se partieron a `mensajes-cita.test.ts` (el de `mensajes.ts` pasaba de 300 líneas).
- **D34** — Ventana de 15 minutos desde `creadoEn`, borde inclusivo; sólo texto propio y enviado.
- **D35** — `puedeBorrar` = enviado, no eliminado y (autor o `puedeModerar`, que llega de `puede(…, 'chat.moderar')`).
- **D36–D38** — Editar y borrar esperan a la base y se aplican por `reemplazar(id, …)`; el error queda dentro del editor o del diálogo; el borrado vive en `?panel=borrar-mensaje&mensaje=<id>`.
- **D39 (ajuste)** — El menú es de Base UI, no Radix: el foco no vuelve al «⋯» tras elegir una acción (`finalFocus`) y los renglones usan `onClick`. El reloj de `puedeEditar` se toma al abrir el menú.
- **D40–D43** — Cumplidas: la cita sobre el redactor se conserva al reintentar; los estados del hilo ya estaban (7.09-3) y se documentan en `docs/UX.md`; Nivel 1 con e2e dirigido en los dos proyectos; lo demás queda fuera.
- **D44** — El CI cayó en `e2e/cotizar-tarea-de-oro-recorrido.spec.ts` (escritorio): la entrada de Chat en la navegación suma una parada de Tab (59 → 60 la asesora; 55 → 56 la dueña); el celular no cambia. Contados de nuevo con el spec dirigido en los dos proyectos (6 ✓, `.piloto/salidas/7.09/recorrido.log`).
