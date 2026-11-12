## 2026-11-12 — Paso 7.09-1: base del módulo `chat` y la lista de conversaciones (parte 1 de 4 del 7.09)

- **Hecho:** el núcleo del módulo `chat` y `/chat` con su lista. Sin migración, policy ni `db:types`: sólo lee con lo que dejó 7.08.
  - `entities/conversaciones.ts` (tipo, parser Zod de `chat_conversaciones`, cursor, `fundirPagina`, `sumarPagina`, `tituloDe`, `textoDeNoLeidos`,
    `idDeConversacionEnLaUrl`) con su test; `entities/repositorios.ts`.
  - `infra/consultas.ts` (la RPC y la lectura de una conversación por la fila propia de miembro), sus pares servidor y `*.client.ts`,
    `infra/realtime.client.ts` (dos señales, sin `DELETE`), `composicion.ts`, `composicion.client.ts`, `index.ts`, `client.ts`, `pantallas/chat.ts`.
  - La lista (`features/conversaciones/`: hook con «Ver más», tope y señales; fila con insignia «n sin leer» y silenciada; vacío, error y pie) y
    `ZonaDelHilo`/`EstadoSinConversacion` (`features/mensajes/`, primeros archivos del área). `/chat` con maestro-detalle por `?c=`, dos pantallas en el
    celular y los estados sin permiso, vacío, error y «ya no es tuya». `chat` prendido en `navegacion.ts`.
  - Guarda: `chat_conversaciones` registrada en `scripts/guardas/areas-c/paginas-en-la-base.ts`.
- **Commits:** `5a30419e` (entidades), `3f2302db` (lecturas), `45b42d1e` (lista y pantalla `/chat`), `5cb82f1a` (e2e) y el de docs.
- **Verificación** (`.piloto/salidas/7.09-1/`):
  - `entities/conversaciones.test.ts` 11 ✓ (primero rojo: no existía la entidad). `scripts/guardas` 34 archivos, 1.078 ✓. `typecheck` y `lint` sin avisos.
  - `e2e/chat.spec.ts`: 8 ✓, 4 en `escritorio` y 4 en `movil` (`e2e-chat.txt`): un mensaje de Luis llega sin recargar, su insignia pasa de «1» a «2 sin leer»
    y la fila sube; abrir una conversación la selecciona por `?c=` y en el celular «Volver a la lista» regresa; «ya no es tuya»; sin `chat.participar`.
  - Dirigidos por la entrada nueva del menú: `acceso`, `barra-superior-celular` y `agenda`: 26 ✓, 5 saltadas por diseño (`e2e-menu.txt`).
- **No se hizo (con su parte):** iniciar una directa, grupo, canal global, silenciar y salir → 7.09-2; el hilo, el redactor, el envío y el assert completo
  del paso (dos sesiones) → 7.09-3; responder, editar y borrar, y los docs finales (`UX`, `GLOSARIO`, `RENDIMIENTO`) → 7.09-4.
- e2e completo: no (7.09-1, Nivel 2: lo corre el CI del PR; dirigidos en verde)
- **Para el coordinador:** una línea bajo la fila 7.09 de `docs/PLAN.md`: «7.09-1 hecha (base y lista); faltan 7.09-2 (iniciar, grupo, global, silenciar,
  salir), 7.09-3 (hilo y envío, assert) y 7.09-4 (responder, editar, borrar)». El plan de las tres partes que siguen está en `.piloto/planes/7.09.md`
  («Servida: 7.09-2/3/4»).
