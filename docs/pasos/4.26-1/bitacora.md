## 2026-11-08 — Paso 4.26-1: comprobantes en la base: la serie vigente, emitir y anular sin huecos, y la papelera y marcar final con comprobante

- **Hecho:** base sola, cuatro commits de código. El plan pasó por una auditoría que bloqueó (marcar otra final mandaba a la papelera la final con comprobante;
  congelar el nombre del cliente lo filtraba): las 11 objeciones se corrigieron en el plan sin 2.ª ronda, y la compuerta `datos` se contestó «aprobar» con las
  recomendadas de P1 a P7 (`decisiones.md`).
  - `comprobantes_ajustes` guarda la serie vigente («A») y la cambia `comprobantes_serie_cambiar` con `empresa.ajustes.gestionar` y versión.
  - `comprobante_emitir(cotización, versión)`: la serie y `datos` los pone la base (el recorte del nivel «todos», sin nombre de cliente); pide ver la cotización,
    final activa y su versión; un vigente por cotización; candados cotización → serie → contador; el número sin huecos.
  - `comprobante_anular`: ver la cotización, motivo de hasta 500 y PT409 si ya estaba anulado.
  - La papelera rechaza una cotización con comprobante (P3 a) y `_final_aplicar` no reemplaza una final con comprobante vigente (P7 a).
  - El 4.26 se parte: sigue el **4.26-2** (la guardada: emitir, la sección «Comprobantes» y anular) y el **4.26-3** (la pestaña «Comprobantes» de Empresa).
- **Verificación** (`.piloto/salidas/4.26/`):
  - Las pruebas nuevas se escribieron antes que el código; su rojo (la firma vieja) no se guardó, como pide el paso.
  - `db:probar` entero en el hook del commit 4: 758 ✓, 0 ✗ (`commit-4.txt`). Las de comprobantes solas: 14 ✓ (`db-probar-comprobantes-3.txt`); las de la
    papelera, `areas/final` y E6: 84 ✓ (`db-probar-papelera-final-1.txt`).
  - E7 (pedida por la auditoría del informe): un vigente colado después del chequeo previo llega al índice dentro del bloque y da el PT409 sin número ni
    comprobante (`db-probar-e7.txt`, 7 ✓ en `emitir.sql`).
  - E6 prueba marcar; crear una final pasa por el mismo `_final_aplicar`, pero con una final activa cae antes con el 23505 de `_final_crear_mirar`.
  - Carreras: K1–K7 en verde, sin 40P01 (`carreras-comprobantes-2.txt`, y K6–K7 también dentro de `db-carreras.txt`); `db:carreras` entero, 200 ✓, ya con las de comprobantes (`db-carreras.txt`); las de
    marcar y crear final, 22 ✓ (`carreras-final.txt`).
  - `db:lint` sin errores (avisos viejos, ninguno de estas funciones: `db-lint.txt`); `db:types` regenerado; `carriles.mjs origin/main b/4.26`, 22 archivos
    (`guarda-carriles.txt`); `scripts/guardas`, 1.023 ✓ (`guardas.txt`); `typecheck` 0 (`typecheck.txt`); `mapa.sh --check` 0 (`mapa-check.txt`, con su código); saltadas nuevas: 0 (`saltadas.txt`).
  - `nivel.mjs` con los archivos reales: Nivel 2 (disparadores `rls` y `estructura`, `nivel.txt`).
  - e2e dirigido en `escritorio` con `E2E_SIN_FUNCIONES=1`: `cotizaciones-papelera-purgar.spec.ts`, 5 ✓ (`e2e-dirigido.txt`).
    e2e completo: no (4.26-1, base: Nivel 2, el completo lo corre el CI del PR; en local, lo dirigido en escritorio + carreras de comprobantes + db:carreras)
- **Para el carril A:**
  1. `docs/PLAN.md`: la fila 4.26 dice «se parte en 4.26-1 (la base: serie vigente, emitir y anular, carreras; hecho el 2026-11-08), 4.26-2 (la guardada) y
     4.26-3 (la pestaña de Empresa); cada parte menos la última sale con `parcial`». En `plan.yaml`, `4.26-1`, `-2` y `-3` en el carril c, con los mismos
     `modulos`, encadenados.
  2. 4-89 (`PLAN.md`): decidido con P1 a (`empresa.ajustes.gestionar`, que ya abre Empresa: no hace falta tocar `NAVEGACION`); se cierra en el 4.26-3.
  3. El P4 del 4.24 (`DECISIONES.md`, «se decide en el 4.26»): resuelto con P3 a.
  4. `scripts/carreras.mjs` ya corre las de comprobantes (commit 3); las de `areas/final` siguen fuera.
  5. `src/modules/cotizaciones/CLAUDE.md` ya nombra `comprobantes_ajustes` y `comprobantes_serie_cambiar` (editado en este paso).
- **Abierto nuevo:** la papelera de **vehículos** mira los comprobantes (`_vehiculo_motivo_de_bloqueo`) sin tomar las cotizaciones del vehículo: si se emite entre ese
  chequeo y el `update` que se las lleva, la final con comprobante entra a la papelera con el vehículo. Es raro y no se arregla aquí. La salida que propuso la
  auditoría: que emitir tome el vehículo `for key share` antes de la cotización (el orden de marcar), con su carrera contra vincular y las papeleras.
- **Commits:** `6fe9a77a` feat(db): emitir y anular comprobantes con la serie vigente · `a5cf675c` test(db): permisos, rls y datos de los comprobantes ·
  `7bb03e75` test(db): carreras de la numeración de comprobantes · `dfb0a28e` feat(db): una cotización con comprobante no va a la papelera · `7fc6b168` test(db)
  de E7, que pidió la auditoría del informe · y el de docs.
