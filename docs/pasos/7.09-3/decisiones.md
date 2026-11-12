## 2026-11-12 — 7.09-3

Siguen la numeración de la parte 2 (llegó a D21). Plan: `.piloto/planes/7.09-3.md`.

- **D22** — La señal de `mensajes` de la lista pierde el filtro `autor_id=neq.<yo>`: sin eso, lo que escribo no mueve mi propia fila. La RLS sigue decidiendo qué llega. Para poder suscribirse sin filtro,
  `suscribirseACambios` (`shared/lib/supabase/canal.client.ts`) hace `filtro` opcional (no manda `filter`), con su prueba.
- **D23** — La primera página del hilo se lee en el navegador al montar (esqueleto mientras llega); se descartó `infra/mensajes.ts` de servidor. El hilo se reinicia con el `key` que ya tiene la página.
- **D24** — El `select` del hilo no trae el embed `responde`; la cita es de 7.09-4 (ensancha `COLUMNAS_DEL_HILO` y el esquema).
- **D25** — La señal relee los 20 más nuevos y funde por `id`; con hueco (más atrás y ningún `id` conocido) reemplaza lo enviado cargado y vuelve a ofrecer «Ver anteriores». Un `UPDATE` más viejo que esos 20 no se refresca.
- **D26** — Envío optimista sin `revalidatePath` ni `useEnLinea`: siempre se intenta; si no llega queda «No enviado · Reintentar» y reintentar reusa el mismo `id` y cuerpo (`repetido`). Los envíos van de a uno, en orden.
- **D27** — `chat_leer` va por una Server Action (`marcar-leido`), sin `revalidatePath`; un fallo no se dice y se reintenta con el siguiente cambio.
- **D28** — `<IrAUnaFecha>` sólo se ofrece al llegar al tope de 500, junto a `<AvisoDeTope>`. Mirando desde una fecha, el hilo no sigue lo nuevo ni marca leído; enviar vuelve a lo más reciente.
- **D29** — Fuera de la parte: separadores de día, borrador persistente, «no leídos desde aquí», adjuntos y fichas.
- **D30** — Nivel 1 (no toca `_shell`, `shared/ui`, la base ni `database.types.ts`; sí `shared/lib/supabase`, que `nivel.mjs` no cuenta como disparador); e2e dirigidos en `escritorio` y `movil`.
- **D31** — El aviso de largo del redactor y su botón viven en `redactor.tsx` (no hay `pie-del-hilo.tsx`); el cuerpo (cargando, error, vacío, lista) está en `cuerpo-del-hilo.tsx` y `hilo.tsx` sólo une hooks.
