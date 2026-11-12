## 2026-11-12 — Paso 7.09-4: responder, editar, borrar y los docs del paso (parte 4 de 4 del 7.09)

- **Hecho:** responder, editar dentro de la ventana y borrar mensajes en el hilo de `/chat`, sólo con `mensaje_enviar`, `mensaje_editar` y `mensaje_eliminar` de 7.08. Sin migración, policy, RLS ni `db:types`.
  - `entities/reglas-del-mensaje.ts` con su test: ventana de 15 minutos desde la creación (borde inclusivo), `puedeEditar`, `puedeBorrar` (el autor o `chat.moderar`), `puedeResponder`,
    `motivoParaNoBorrar`, `textoDeCita`, `citaDe`, `leerResultadoDeEdicion`. `Mensaje` gana `responde` (la cita).
  - Server Actions `editar-mensaje` y `eliminar-mensaje` (sin `revalidatePath`); `useEdicion`, `useBorradoPorUrl` (`?panel=borrar-mensaje&mensaje=<id>`, registrado en la guarda de confirmaciones con URL),
    `reemplazar` en `useLocalesDelHilo`; `useEnvio` conserva el mensaje respondido al reintentar.
  - Componentes: el «⋯» de la burbuja (Responder, Editar, Borrar), `cita-de-respuesta`, `editar-en-linea`, `confirmar-borrado`; `page.tsx` pasa `puedeModerar` con `puede(…, 'chat.moderar')`.
  - **Hallazgo:** el embed `responde:mensajes!mensajes_responde_a_id_fkey(…)` del plan no sirve sobre una relación a sí misma: con el nombre de la FK, PostgREST responde 400 (ambigua); con la columna
    (`!responde_a_id`) devuelve un arreglo de respuestas. La cita se lee aparte, por `mensajes_pkey`, sólo si la página trae respuestas (`fix` aparte).
- **Commits:** `c8837036` (reglas y cita), `96221cc5` (editar y eliminar por RPC), `58e49a25` (responder), `c5448cc5` (editar), `e8a143d2` (borrar), `696ff59a` (fix: cita aparte), `1d34bb82` (e2e) y el de docs.
  Son 7 de código (6 del plan más el fix del hallazgo).
- **Verificación** (`.piloto/salidas/7.09-4/`):
  - `vitest run src/modules/chat scripts/guardas src/shared/lib/supabase`: 45 archivos, 1.191 ✓ (`vitest.txt`). `typecheck` y `pnpm lint` sin avisos.
  - `e2e/chat.spec.ts`: 9 ✓ en `escritorio` y 9 ✓ en `movil` (`e2e-chat-ambos.txt`). Nueva: Ana responde a Luis (sólo Responder en lo ajeno), edita lo suyo y lo borra con el diálogo de la URL; Luis lo ve todo sin
    recargar y la base lo confirma.
- **No se hizo (D43):** ir al original desde la cita, deshacer un borrado, editar fichas, menciones y `/tarea` (7.10), reacciones, copiar texto, historial de ediciones. Sin e2e de la ventana vencida ni de `chat.moderar`
  en la interfaz (la regla pura y la base ya los prueban).
- **Pendiente para la persona:** agregar o quitar miembros de un grupo no tiene pantalla en ningún paso.
- e2e completo: no (7.09-4, Nivel 1: lo corre el CI del PR; dirigidos en verde)
- **Para el coordinador:** una línea bajo la fila 7.09 de `docs/PLAN.md`: «7.09-4 hecha (responder, editar dentro de 15 min, borrar con `<Confirmar>` por URL; docs del paso); 7.09 completa (4 de 4)».
