---
paths:
  - 'src/modules/*/features/**/actions/**'
  - 'src/app/api/**'
---

# Server Actions y route handlers

- Toda action: `actionClient.inputSchema(schema).action(async ({ parsedInput, ctx }) => …)` de
  `@/shared/lib/safe-action`. El schema Zod vive en `../schemas/`, nunca inline.
- `actionClient` ya resuelve el usuario con `getClaims()` y sus permisos (`ctx.permisos`); una
  action sin usuario falla antes de ejecutar. Una action = un caso de uso.
- Verifica el permiso en la action con `puede(ctx.permisos, 'clave', origenId)` **y** deja que la
  base lo vuelva a verificar (RLS/RPC). La UI es comodidad; la base es la seguridad.
- Devuelve valores, no excepciones: `{ ok: true, data }` | `{ ok: false, error: { codigo, mensaje } }`.
  `PT409` → `codigo: 'conflicto'`; `42501` → `codigo: 'sin_permiso'`; `23505` → `codigo: 'duplicado'`.
- Después de mutar: `revalidatePath()` de la pantalla afectada (y `revalidateTag('x', 'max')`
  si hay caché por etiqueta). **Excepción:** una action que se llama desde una pantalla con algo a medio
  tipear (la hoja de cotizar, el ⚙, un editor, los comentarios) no revalida ni refresca: en Next 16 eso
  redibuja la página que llama y remonta lo tipeado; devuelve el dato y el cliente lo aplica. Nada de
  `redirect()` dentro de un `try`.
- Route handlers públicos (portal, webhooks, revalidación de la web): validan el secreto o la
  cookie firmada (HMAC-SHA256 de `node:crypto`, `src/modules/web/infra/portal/cookie.ts`) antes de
  cualquier lectura, llegan a la base sólo por `@/modules/web` (el admin vive en
  `infra/portal/rpc.ts`), y nunca devuelven `ruta` de storage: reciben una `createSignedUrl` de 60 s.
- Nada de trabajo largo en una action (importación CSV, envío de push masivo): encolar y procesar en
  `supabase/functions/`. **apibara** es la excepción razonada: la llamada vive en la edge function
  `apibara` (tiene la clave) y la hace el navegador con su sesión (`functions.invoke`), de a pocas
  y con resultado por línea; la action sólo guarda (`crearVehiculo`, `refrescarSubasta`). **La importación
  de leads es la otra**: el navegador manda lotes de 50 filas (~50 ms cada uno), cada fila vale por
  sí misma y es idempotente por su id; la edge function `importar-csv` es del «todo» del dueño (`/datos`).
