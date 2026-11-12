## 2026-11-12 — Paso 7.10-1: leer y dibujar menciones, y el drawer por URL (parte 1 de 3 del 7.10)

- **Hecho:** el hilo de `/chat` lee y dibuja `#[tipo:uuid]` y las fichas de vehículo, lead y cotización. Sin migración, policy, RLS ni `db:types`; sólo lecturas con la sesión de quien mira.
  - `entities/menciones.ts` con su test: parser del cuerpo (texto y menciones sin perder un carácter; uuid en minúsculas; referencias únicas hasta 20) y `referenciaDeUrl()`.
  - `entities/referencias.ts` con su test: `resolverClase()` (lo que no vino es `sin_acceso`, `eliminado_en` es `eliminado`, una fila mal formada es un valor de error) y `Mensaje.ficha`.
  - `infra/referencias.client.ts`: una lectura por clase y por tanda de 100 ids; `useReferenciasDelHilo` (con su test: una llamada por cambio, sólo lo nuevo, reintentar).
  - `ChipDeMencion`, `CuerpoConMenciones`, `useMencionPorUrl` y `DrawerDeMencion` (diferido, montado con `useAbiertoAlgunaVez`; registrado en `scripts/guardas/areas-c/drawers-con-salida.ts`).
  - `Hilo` extrajo `useRespuesta` y `useMencionesDelHilo` (el límite de 80 líneas por función).
- **Commits:** `080d1f23` (parser), `efac53b8` (resolver), `b2f34037` (dibujar), `10647dda` (drawer), `e98000d4` (e2e) y el de docs.
- **Verificación** (`.piloto/salidas/7.10-1/`):
  - `vitest run src/modules/chat scripts/guardas`: ver `vitest-final.txt`. `typecheck` y `pnpm lint` sin avisos (los corrió el hook de cada commit).
  - `e2e/chat-menciones.spec.ts` y `e2e/chat.spec.ts`: 24 ✓ en `escritorio` y `movil` (`e2e-dirigidos.txt`). Nueva: Luis, sin `leads.ver`, lee «No tienes acceso a este lead» (ni el nombre ni el id están en el DOM) y su drawer no abre datos
    ni enlace; la dueña ve `#<nombre>`, abre el drawer sin salir del chat, el enlace es `/leads?lead=<id>`, recargar lo mantiene y cerrar limpia la URL; un token a un vehículo inexistente se lee «No tienes acceso a este vehículo».
- **No se hizo (es de las partes que siguen):** el selector `#` del redactor y enviar con `p_menciones` (7.10-2); `/tarea`, `/evento`, sus fichas y completar (7.10-3). Las fichas de tarea y evento dicen «Tarea · Cargando…» / «Evento · Cargando…».
- e2e completo: no (7.10-1, Nivel 1: lo corre el CI del PR; dirigidos: chat, chat-menciones)
- **Para el coordinador:** una línea bajo la fila 7.10 de `docs/PLAN.md`: «7.10-1 hecha (leer y dibujar menciones y fichas bajo la sesión de quien mira; drawer `?mencion=`); 7.10 parcial (1 de 3)».
