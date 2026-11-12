## 2026-11-12 — Paso 7.09-3: el hilo y el envío (parte 3 de 4 del 7.09)

- **Hecho:** el hilo de `/chat` y el envío, sólo con `mensaje_enviar` y `chat_leer` de 7.08. Sin migración, policy, RLS ni `db:types`.
  - `entities/mensajes.ts` con su test (23 pruebas más 4 de `aplicarResultado`): lectura de filas, fusión por `id` con lo pendiente al final, cabeza con hueco, texto válido (4.000), borde
    exclusivo de «Ir a una fecha», `ultimoDeOtro`, `leerResultadoDeEnvio`. `LectorDeMensajes` y `RepositorioDeMensajes` en `repositorios.ts`.
  - `infra/mensajes.client.ts` (el hilo se lee en el navegador por `mensajes_hilo_idx`), `infra/mensajes-escritura.ts` (`mensaje_enviar`, `chat_leer`), `suscribirseAlHilo`.
    Dos Server Actions (`enviar-mensaje`, `marcar-leido`) sin `revalidatePath`.
  - Hooks `use-hilo` (con `use-senales-del-hilo`, `use-recorrido-del-hilo`, `use-locales-del-hilo`, `hilo-leido`), `use-envio`, `use-marcar-leido`, `use-scroll-del-hilo`; componentes `hilo`,
    `cuerpo-del-hilo`, `lista-del-hilo`, `burbuja`, `redactor`, `diferidos`. El hilo reemplaza el «Los mensajes llegan con la siguiente parte.».
  - La señal de `mensajes` de la lista ya no filtra `autor_id=neq` (mi fila sube al escribir); para ello `suscribirseACambios` admite no pasar `filtro` (con su prueba).
- **Commits:** `116c3852` (entidades), `a3f67532` (lectura y escritura), `00e043a1` (hilo), `77db9f6f` (redactor y envío), `dda23cb0` (marcar leído y D22), `607cb8a9` (e2e) y el de docs.
- **Verificación** (`.piloto/salidas/7.09-3/`):
  - `vitest run src/modules/chat scripts/guardas src/shared/lib/supabase`: 43 archivos, 1.172 ✓ (`vitest.txt`). `typecheck` y `eslint` sin avisos.
  - `e2e/chat.spec.ts`: 8 ✓ en `escritorio` y 8 ✓ en `movil` (`e2e-chat-escritorio.txt`, `e2e-chat-movil.txt`). Nuevas: el assert del paso (Ana escribe a Marta; Marta lo ve sin recargar con
    «1 sin leer», que se limpia al abrir y la base anota `ultimo_leido_en`; la respuesta le llega a Ana) y el reintento sin red (queda «No enviado · Reintentar» y llega una sola vez).
- **No se hizo (con su parte):** responder (cita), editar, borrar y los docs finales (`UX`, `GLOSARIO`, `RENDIMIENTO`) → 7.09-4. Sin `pie-del-hilo.tsx`: el aviso de largo vive en `redactor.tsx`.
- e2e completo: no (7.09-3, Nivel 1: lo corre el CI del PR; dirigidos en verde)
- **Para el coordinador:** una línea bajo la fila 7.09 de `docs/PLAN.md`: «7.09-3 hecha (hilo, envío optimista, marcar leído; assert del paso cerrado); falta 7.09-4 (responder, editar, borrar, docs finales)».
