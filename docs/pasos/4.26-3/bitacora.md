## 2026-11-08 — Paso 4.26-3: la pestaña «Comprobantes» de Configuración › Empresa

- **Hecho:** dos commits de código. La regla de la serie (de 1 a 12 letras, números o guiones, en mayúsculas: P6 a), su lectura con el último número del
  contador y la action `cambiarSerie` (sólo `empresa.ajustes.gestionar`, P1 a). La pestaña «Comprobantes» de Empresa pide esa clave: nadie nuevo entra a
  Empresa; quien sólo emite comprobantes o sólo gestiona tipos de cambio no la ve. Muestra la serie vigente, el próximo comprobante y el campo para cambiarla con
  su versión.
- **Verificación** (`.piloto/salidas/4.26-2/`): `comprobantes.test.ts` con `cambiarSerie`, 10 ✓ y `pestanas.test.ts` de la pestaña, 3 ✓ (dentro de los 1.112 ✓
  de `vitest-empresa.txt`); e2e `empresa-comprobantes.spec.ts` (`@sin-celular-archivo`), `empresa` y `configuracion-200` dentro de los 53 ✓ de
  `e2e-escritorio.txt`. `secciones.test.ts` sigue verde: la clave ya estaba en `NAVEGACION`.
  e2e completo: no (4.26-3, pantalla: Nivel 1; el completo lo corre el CI del PR por las migraciones del 4.26-1; en local, lo dirigido en escritorio)
- **Para el carril A:**
  1. `docs/PLAN.md`: la fila 4.26 pasa a «hecho el 2026-11-08, en 4.26-1 (la base), 4.26-2 (la guardada) y 4.26-3 (la pestaña de Empresa)»; en `plan.yaml`,
     `4.26-2` y `4.26-3` hechos.
  2. **4-89** queda cerrado con P1 a: la pestaña de un área de Empresa pide `empresa.ajustes.gestionar`, que ya abre Empresa.
  3. El tope de JS de `/cotizaciones/[id]` no se subió (442,8 de 448).
  4. `e2e/soporte/base.ts` (`borrarPersonasDePrueba`) y `cotizar-formula.ts` (`borrarOrigenesDeCotizar`) sueltan antes los comprobantes y la serie de prueba
     (`fix` `4029413e`): son del núcleo de e2e, se editaron sin borrar nada.
  5. Abierto que sigue del 4.26-1: emitir contra la papelera de vehículos.
- **Commits:** `c6d1258c` cambiar la serie desde una action · `ed8ffb3d` la pestaña de Empresa · y el de docs.
