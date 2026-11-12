## 2026-11-12 · Paso 7.11-2: «Escribirle por chat» y `/chat?con=` (parte 2 de 2)

### Hecho

- `/chat?con=<usuario>`: `idDeUsuarioEnLaUrl` (puro, con test), `abrirConversacionCon` (composición e `index.ts` de `chat`) y la página, que lo resuelve antes de leer la lista: con éxito va a `/chat?c=<id>`; si la base lo niega (o es uno mismo) lo dice arriba y deja la lista.
- `Verificacion.duenoId` (sólo si la base manda `dueno_id`), `ProveedorDeEscribirPorChat` (booleano del layout, `chat.participar`) y el enlace «Escribirle por chat» tras «Lo tiene X.» en el aviso del teléfono. `leads` no importa `chat`.
- `e2e/chat-widget.spec.ts`: dos casos nuevos (el enlace desde el alta abre la directa ya existente, sin duplicarla; `/chat?con=` con alguien sin chat lo dice y deja la lista). `e2e/leads-alta.spec.ts`: sin chat no hay enlace.

Commits: ver `git log` de la rama (tres de código y el de docs).

### Verificación

- Vitest: `verificacion.test.ts` (`duenoId` sólo si viene, GUID ilegible = error) y `conversaciones.test.ts` (`idDeUsuarioEnLaUrl`); `scripts/guardas` 1.119 en verde; `typecheck`, `lint` y `mapa.sh --check` limpios. Sin SQL: no corre `db:probar`.
- e2e (`.piloto/salidas/7.11/`): `chat-widget` escritorio 4 y movil 3 en verde (las saltadas son de cada proyecto), `chat` 9 y 9, `leads-alta`, `-casos`, `-un-drawer`, `-contexto` y `leads-ficha-telefonos` en escritorio 40, `leads-alta-un-drawer` y `leads-ficha-telefonos` en movil 15, `presupuesto-js` y `avisos-sobre-el-pie` 14 (escritorio) y 6 (movil, 8 saltadas): sin subir ningún tope.
- Ojo: correr `chat-widget` y `chat` en el mismo comando los hace compartir terreno (cada uno borra y siembra las mismas personas) y un caso del widget cae; van en comandos aparte.

### Para copiar a `docs/PLAN.md` y `docs/ESTADO.md` (la sesión de un carril no los edita)

- Bajo la fila 7.11: «7.11 completa (2 de 2)».
- Quitar «Escribirle por chat» de `docs/ESTADO.md` › «Pendientes que se arrastran» y de los arrastrados de la Fase 8.

e2e completo: no (7.11-2, Nivel 2; dirigidos: chat-widget, chat, leads-alta, leads-alta-casos, leads-alta-un-drawer, leads-alta-contexto, leads-ficha-telefonos, presupuesto-js, avisos-sobre-el-pie en escritorio y movil)
