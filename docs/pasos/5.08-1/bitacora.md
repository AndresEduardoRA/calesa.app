## 2026-11-11 — Paso 5.08-1: «Requisitos para entrar», lista, orden, quitar y agregar un dato (parte 1 de 3)

- **Hecho:** el bloque «Requisitos para entrar» del inspector de una fase, en el área `requisitos` de `flujos`.
  - `entities/requisitos/`: las claves de dato por ámbito con su etiqueta (`claves.ts`, comparada con el SQL), la descripción humana, el formulario de «Dato»
    con su validación (porcentaje 1 a 100, notas ≤ 500), el orden («después de X») y las respuestas de las RPC.
  - `infra/requisitos/` y `features/requisitos/`: la lectura de los tipos de documento (`tope + 1` por grupo), las tres RPC (`requisito_crear|mover|eliminar`) con el
    campo del `hint`, los esquemas y las cuatro actions (tres de escritura y una de lectura), con el permiso del flujo antes de escribir.
  - El bloque: lista en orden con «Bloqueante»/«Informativo», orden por botones con foco, «Quitar» con `<Confirmar>` en `?eliminar=requisito&quitar=<id>`,
    «Agregar requisito» en línea (`?agregar=dato`). `pantallas/requisitos.ts` y `huecos.ts` lo conectan; `confirmar-con-url.ts` lo registra.
  - `docs/UX.md` gana «Flujos: requisitos para entrar (estados propios)»; la ficha de `flujos`, «Requisitos (5.08)».
- **Cambió respecto del plan:** ver `decisiones.md`. Sin migración (no faltó nada en la base). Los botones de orden no se apagan mientras una escritura va en curso
  (como en 5.09: `mandar` ignora el segundo pedido). La action de crear se llama `crearRequisitoDeDato`; la 5.08-2 sumará las otras.
- **Para la parte 2 (5.08-2):** formas Documento y Espera y editar con `requisito_guardar`, según `.piloto/planes/5.08.md` › «Lo que deja servido la parte 2». El
  `client.ts` del área ya trae etiquetas, descripción y las actions de esta parte; `descripcionDeRequisito` dice «una fase del otro flujo» hasta que la 2 lea las fases.
- **Verificación** (`.piloto/salidas/5.08/`): e2e dirigido en escritorio, 2 ✓ (`e2e-requisitos.txt`: agregar VIN y pagos con 50 %, subir con el teclado, quitar por la
  URL; quien sólo tiene `flujos.configurar`) y los vecinos `configuracion-flujos.spec.ts` y `configuracion-flujos-documentos.spec.ts`, 6 ✓ (`e2e-dirigidos.txt`).
  `scripts/guardas`: 34 archivos, 1.065 ✓. Pruebas de `src/modules/flujos/{entities,features}/requisitos`: 29 ✓. `tsc` y `eslint` sin avisos.
  e2e completo: no (5.08-1, Nivel 1, sin disparadores: lo corre el CI del PR; dirigidos en escritorio, sin celular por ser Configuración)
