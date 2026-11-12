# 8.01-2: decisiones (2026-11-12)

- **D1 · La rueda es del área `turnos`** (lo dice la fila). El componente va en `features/turnos/rueda/components/`, un caso dentro del área (como
  `logistica/features/mover/lote/`), y deja lugar a otros casos de turnos (8.05).
- **D2 · La dirección pública es del área `sitio`.** `infra/queries/sitio.ts` pasa a `infra/sitio/direccion-publica.ts` (un archivo, una
  responsabilidad: 8.01-4 suma el escritor al lado) y la interfaz a `entities/sitio/repositorios.ts` (en la raíz de `entities/` sería núcleo).
- **D3 · Hay `areas/nucleo/` aunque hoy esté vacío:** lo exige el modelo (las guardas de `logistica` y `repuestos`) y da lugar a lo compartido sin tocar
  las entradas de la raíz.
- **D4 · Sin `features|entities|infra/nucleo/` vacíos:** la guarda no los pide; los crea quien los llene.
- **D5 · La guarda nombra el área de una pantalla con `PANTALLAS_DE_AREA` antes de mirar el prefijo.** `pantallas/perfil.ts` no cambia de nombre (la
  fila) y es de `turnos`; los huecos `sitio-guias|faqs|testimonios` (8.01-3) reexportarán `features/contenido/`. Sin el mapa, `perfil` sería núcleo y
  el núcleo no importa áreas. Es una tabla: reversible. `htmlDelDocumento` no sale por `areas/contenido/` hasta que alguien lo use (8.03).
- **D6 · La guarda vive en `scripts/guardas/areas-b/`** (del carril B), como la de `repuestos` en `areas-c/`, y no se registra en ningún archivo del
  carril A: es un `*.test.ts` que vitest descubre.
