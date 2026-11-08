## 2026-11-08 — Paso 4.23-3: las tablas de referencia se editan, reordenan y publican desde Configuración › Cotización

- **Hecho:** la pestaña «Tablas» (`?seccion=tablas&origen=&tabla=`, `cotizaciones.configurar`): la lista del origen y las compartidas, y el editor de una tabla
  con la tabla entera en memoria, de a 100 filas, que edita celdas con el locale de la empresa, suma, quita con «Deshacer» y mueve filas, marca el primer error
  con «Ir a la celda», guarda un borrador por versión en la pestaña y publica con nota (`?panel=publicar-tabla`). Seis commits de código.
  - El plan se auditó una vez (`observaciones`, atendidas en el plan; `.piloto/planes/4.23.respuestas.md`). El 4.23 se parte en cuatro: el enlace «Ver la tabla
    entera» desde la ayuda de la hoja va a un 4.23-4 del carril A (`decisiones.md`).
- **Lo que quedó:**
  - `entities/tablas/celda-tipeada.ts` (lo tipeado a número, año o texto; sólo `leerNumeroTipeado`), `vista-del-editor.ts` (páginas, crudos, primer error,
    cambios, el camino de la base a su celda) y `borrador-de-tabla.ts` (por versión), con sus tests; `rutas.ts`.
  - `features/tablas/`: la sección y la lista, `TablaAbierta` (sólo si está en la lista del origen), el editor por `diferido()` y «Publicar» con
    `ModalDeFormulario`.
  - `src/app/(app)/configuracion/cotizacion/`: la pestaña «Tablas» al final, su bloque en la página, `tabla` en la barra y la descripción del hub.
- **Verificación** (`.piloto/salidas/4.23-3/`):
  - vitest de lo tocado: 75 en verde (`vitest-related.txt`); entidades del área: 64 (`vitest-entidades.txt`). Guardas y `mapa.test.ts`: 1.024 (`guardas.txt`).
    `tsc`: 0 errores (`tsc.txt`). `mapa.sh --check`: 0.
  - Mutaciones de C1 (dinero): M1 (`Number` con coma por punto en vez de `leerNumeroTipeado`) cae en 3; M2 (el año sin mirar decimales) y M3 (el texto sin
    recortar) en 1 cada una (`mutaciones.txt`).
  - e2e en escritorio: el nuevo `configuracion-cotizacion-tablas.spec.ts`, 1 en verde (`e2e-tablas.txt`); los dirigidos por la barra de pestañas
    (`configuracion-cotizacion-formula`, `-niveles-permisos`, `-niveles`, `configuracion-200`), 41 en verde (`e2e-dirigidos.txt`).
  - `nivel.mjs`: Nivel 1, sin disparadores, con interfaz (`nivel.txt`). Sin `db:carreras` ni `db:probar`: no toca `supabase/`.
- e2e completo: no (4.23-3, pantalla de Configuración: Nivel 1, lo dirigido en escritorio; el completo lo corre el CI del PR)
