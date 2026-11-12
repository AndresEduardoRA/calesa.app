## 2026-11-11 — Paso 5.11: «Reglas» y la oferta de transporte

- **Hecho:** la pestaña `?seccion=reglas` de Configuración › Flujos, en el área `reglas` de `flujos`, sobre las RPC del 5.10 (sin migración).
  - `entities/reglas/`: `catalogo.ts` (las 10 claves con nombre, qué permite y qué enciende; el test las compara con el check de `flujos_reglas` y con
    `_flujo_regla_admitida`, incluidas las tres exclusiones de repuestos), `impacto.ts` (la frase de «no se puede apagar» y el enlace a la fase),
    `oferta.ts` (vacío = se ofrecen todos, la firma del borrador), `permiso.ts` y `repositorios.ts`.
  - `infra/reglas/`: la oferta por `flujo_oferta()`, el catálogo de puertos y navieras activos (`limit 201`) y las tres RPC (`flujo_regla_impacto`,
    `flujo_regla_cambiar`, `flujo_oferta_guardar`).
  - `features/reglas/`: las actions `cambiarRegla` (pregunta el impacto antes de escribir) y `guardarOferta`, los hooks y los componentes; la pestaña.
- **e2e completo: no (5.11, pantalla Nivel 1; lo corre el CI del PR)**
- **Verificación** (`.piloto/salidas/5.11/`): vitest de `entities/reglas`, `features/reglas`, `scripts/guardas`, `src/modules/flujos` y la carpeta de
  Configuración › Flujos: 52 archivos, 1.180 pruebas en verde. `e2e/configuracion-flujos-reglas.spec.ts` (escritorio): 1 en verde, 7,0 s
  (`e2e-reglas.txt`); los vecinos `configuracion-flujos` y `configuracion-flujos-documentos`: 6 en verde (`e2e-vecinos.txt`). La base local se reseteó
  antes (traía menos migraciones que `main`): `db-reset.txt`.
- **Para la persona / Fase 6:** puertos y navieras no tienen pantalla ni RPC de escritura; `navieras` nace vacía. La pantalla lo dice («Se cargan en
  Logística.»). Cargarlas es del paso de `logistica` con `logistica.catalogos.gestionar`.
