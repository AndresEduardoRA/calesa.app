## 2026-11-12 — Paso 7.10-2: selector `#` del redactor y envío con `p_menciones` (parte 2 de 3 del 7.10)

- **Hecho:** el redactor de `/chat` abre un selector con `#` y manda las menciones. Sin migración, policy, RLS ni `db:types`; la base ya traía `p_menciones` (7.08-2).
  - `entities/menciones.ts` con su test: `consultaAbierta`, `etiquetaDeMencion`, `etiquetaLibre` y `aCuerpoConTokens` (puros).
  - `esquemaDeEnvio` suma `menciones`; `repositorioDeMensajes.enviar` pasa `p_menciones`; `useEnvio` las guarda en `Pendiente` (reintentar reusa id, cuerpo y menciones); `editar` manda las menciones que quedan en el cuerpo (cierra la D7 de 7.10-1).
  - `use-busqueda-de-menciones`, `SelectorDeMenciones` (diferido: el chat no paga el buscador hasta el primer `#`), `useMencionesEnRedactor` y `useRedactor`; `Redactor` recibe `usuarioId` y `alEnviar(cuerpo, menciones)`.
  - e2e: `crearConRol` y `prepararChat` aceptan permisos con alcance (Ana con `leads.ver` propios: sin él la base no le deja mencionar su lead).
- **Commits:** `eb00be94` (puro), `744abc86` (enviar y editar), `e219e5d6` (selector), `74f34576` (redactor), `c3198178` (e2e) y el de docs.
- **Verificación** (`.piloto/salidas/7.10-2/`):
  - `vitest run src/modules/chat scripts/guardas`: 46 archivos, 1.232 ✓ (`vitest-final.txt`). `typecheck` y `pnpm lint` sin avisos.
  - `e2e/chat-menciones.spec.ts` + `e2e/chat.spec.ts`: 26 ✓ en `escritorio` y `movil` (`e2e-dirigidos-2.txt`). Caso 4: Ana escribe `#Mencionado`, Escape cierra y Enter manda texto sin mención; con ↓ y Enter elige su lead sin enviar, el campo queda con el nombre, envía y ve el chip;
    en la directa con Luis elige con el clic y el foco sigue en el campo; la dueña ve el nombre y abre el drawer; Luis lee «No tienes acceso a este lead» y el nombre no está en su DOM.
  - La primera corrida (`e2e-dirigidos.txt`) cayó por un error del propio spec (el hilo de Luis ya traía un chip sembrado) y por `chat.spec.ts:247` en escritorio: el `sql` que cuenta el mensaje reintentado corre cuando el chip optimista ya está visible y la RPC aún no terminó (carrera previa; pasó en la repetición y en `movil`; no se tocó).
- **No se hizo (7.10-3):** `/tarea`, `/evento`, sus fichas y completar.
- e2e completo: no (7.10-2, Nivel 1: lo corre el CI del PR; dirigidos: chat, chat-menciones)
- **Para el coordinador:** una línea bajo la fila 7.10 de `docs/PLAN.md`: «7.10-2 hecha (selector `#` y `p_menciones`); 7.10 parcial (2 de 3)».
