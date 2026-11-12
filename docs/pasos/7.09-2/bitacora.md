## 2026-11-12 — Paso 7.09-2: iniciar, grupo, canal del equipo, silenciar y salir (parte 2 de 4 del 7.09)

- **Hecho:** escribir conversaciones desde `/chat`, sólo con las RPC de 7.08. Sin migración, policy, RLS ni `db:types`.
  - `entities/{personas,grupos,escritura}.ts` con sus tests (búsqueda desde 3 letras y tope 20; grupo de 1 a 49 personas más quien lo crea; lectura de la respuesta
    de las RPC; `puedeSalirDe`) y `RepositorioDeConversaciones` / `LectorDePersonas` en `repositorios.ts`.
  - `infra/conversaciones-escritura.ts` (cinco RPC con la sesión de quien actúa; el campo del rechazo sale del `hint`), `infra/personas.client.ts`, cinco
    Server Actions (`features/conversaciones/actions/`) con `revalidatePath('/chat')`.
  - La lista gana el menú «Nueva conversación»: «Mensaje directo» (`?panel=nueva`), «Nuevo grupo» (`?panel=grupo`) y, con `chat.global`, «Entrar al canal del
    equipo». El hilo gana el «⋯» con «Silenciar» / «Dejar de silenciar» y «Salir del grupo» / «Salir del canal» (`?panel=salir`). Los paneles viajan con `diferido()`.
  - Guardas: fila de `modal-de-directa.tsx` en `modales-con-salida.ts` (sólo suma) y de `confirmar-salir.tsx` en `areas-c/confirmar-con-url.ts`.
- **Commits:** `1ebba869` (entidades), `e7133487` (escritura y personas), la directa y el canal, el grupo, silenciar y salir, `c63205a5` (e2e) y el de docs.
- **Verificación** (`.piloto/salidas/7.09-2/`):
  - `entities/{personas,grupos,escritura}.test.ts`: 13 pruebas ✓. `scripts/guardas` y `src/modules/chat`: 39 archivos, 1.116 ✓. `typecheck` y `eslint` sin avisos.
  - `e2e/chat.spec.ts`: 12 ✓ (6 en `escritorio`, 6 en `movil`; `e2e-chat.txt`). Nuevas: Ana busca a Marta y le abre una directa (la lista de Marta la ve sin recargar), Sofía
    se rechaza por la base («Esa persona no puede usar el chat.») sin salir del modal, la directa con Luis no se duplica; un grupo nuevo se silencia y se deja (la base lo confirma).
- **No se hizo (con su parte):** el hilo, el redactor, el envío y el assert completo del paso → 7.09-3; responder, editar, borrar y los docs finales (`UX`, `GLOSARIO`,
  `RENDIMIENTO`) → 7.09-4. El canal global no tiene e2e propio (el rol de prueba no trae `chat.global`): lo cubre `supabase/tests/areas/chat/global.sql`.
- e2e completo: no (7.09-2, sin disparador: lo corre el CI del PR; dirigidos en verde)
- **Para el coordinador:** una línea bajo la fila 7.09 de `docs/PLAN.md`: «7.09-2 hecha (iniciar directa, grupo, global, silenciar, salir); faltan 7.09-3 y 7.09-4».
