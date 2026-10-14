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
- Verificá el permiso en la action con `puede(ctx.permisos, 'clave', origenId)` **y** dejá que la
  base lo vuelva a verificar (RLS/RPC). La UI es comodidad; la base es la seguridad.
- Devolvé valores, no excepciones: `{ ok: true, data }` | `{ ok: false, error: { codigo, mensaje } }`.
  `PT409` → `codigo: 'conflicto'`; `42501` → `codigo: 'sin_permiso'`; `23505` → `codigo: 'duplicado'`.
- Después de mutar: `revalidatePath()` de la pantalla afectada (y `revalidateTag('x', 'max')`
  si hay caché por etiqueta). Nada de `redirect()` dentro de un `try`.
- Route handlers públicos (portal, webhooks, revalidación de la web): validan el secreto o la
  cookie firmada con `jose` antes de cualquier lectura, usan el cliente admin sólo para la RPC
  `web.portal_*`, y nunca devuelven `ruta` de storage: generan `createSignedUrl` de 60 s.
- Nada de trabajo largo en una action (importación CSV, envío de push masivo): encolar y procesar en
  `supabase/functions/`. **apibara** es la excepción razonada: la llamada vive en la edge function
  `apibara` (tiene la clave) y la hace el navegador con su sesión (`functions.invoke`), de a pocas
  y con resultado por línea; la action sólo guarda (`crearVehiculo`, `refrescarSubasta`).
