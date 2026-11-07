## 2026-11-06 — Paso 4.24-2b: purgar desde la papelera de cotizaciones, con `<Confirmar>` por su URL

- **Hecho:** pantalla pura, dos commits de código. Con `cotizaciones.papelera.purgar`, «Purgar» en cada cotización (después de «Restaurar») y «Purgar el lote» si
  quedan más de una. Abren un `<Confirmar>` montado una vez, con su URL `?panel=purgar&lote=<id>[&cotizacion=<id>]` (registrado en
  `scripts/guardas/confirmar-con-url-papelera.ts`, el pedazo que abrió el A en `2f87361d`). El diálogo nombra lo que se borra: una, por su título; un lote de N, hasta
  cinco títulos y «y K más», y pide tipear «purgar N». La action pide la clave antes de llamar a `cotizaciones_papelera_purgar`; la base la vuelve a pedir.
  Lo que la base rechaza se dice en el diálogo: un conflicto apaga el botón y ofrece «Recargar». El resultado va en el aviso: lo purgado y lo bloqueado con su
  motivo, como una final con comprobante. La URL que no abre avisa y se limpia: sin la clave, un lote que no está en la página o una cotización de otro lote.
  La cabecera con la clave suma «, o antes si lo purgas». Arrancó tras la compuerta `afuera` (P1): se esperó el registro del A, «Aprobar y esperar al A».
- **Verificación** (`.piloto/salidas/4.24-2b/`):
  - Rojos contra HEAD: `rojo-head-entities.txt` (12 de `purga`, `resultados` y la action, que no existían), `rojo-head-pantalla.txt` (`url` no existe;
    «Purgar» y el texto de la cabecera no están), `rojo-sin-registro.txt` (la guarda pide la fila de `confirmar-purga.tsx`) y `rojo-head-e2e.txt` (P1, con lo nuevo de
    `src/` apartado: la cabecera no tiene el texto).
  - Verde: `verde-commit1.txt` (58 de Vitest) y `verde-commit2-vitest.txt` (1.059 de `entities/papelera`, `features/papelera` y `scripts/guardas`).
  - e2e dirigidos en `escritorio` y `movil`: `e2e-dirigidos.txt`, 24 en verde y E8 rojo por el tope de bytes; tras fijar el tope, `e2e-e8.txt`, E8 en verde en los dos.
    Son `cotizaciones-papelera-purgar.spec.ts` (P1 a P5) y `cotizaciones-papelera.spec.ts` (E1 a E8).
  - Medido (E8, con la dueña): JS en frío 424,5 KB en 23 chunks (presupuesto 440); página 1, 1.329 nodos. Bytes: 451.595 con lotes de 21 y 451.973 con lotes de 200
    (escritorio; en movil, 451.084 y 451.504). No crece con el lote. `lint` y `typecheck` los corrió el hook de cada commit.
    e2e completo: no (4.24-2b, pantalla, Nivel 1: lo dirigido en escritorio y movil)
- **Abiertos:** ninguno nuevo de código. 4-68 y 4-70 ya los cerraron el 4.24-1a y el 4.24-1b en la base (`decisiones.md` › «Para el coordinador»).
- **Commits:** `96bd2299` feat(cotizaciones): purgar un lote de la papelera por su action · `971193e2` feat(cotizaciones): confirmar la purga de la papelera por
  su url · y el de docs.
