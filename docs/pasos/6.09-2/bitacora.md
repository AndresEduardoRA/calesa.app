## 2026-11-12 — Paso 6.09-2: aduana, escribir (parte 2 de 2; 6.09 completo)

- **Hecho:** quien tiene `logistica.aduana.gestionar` crea, edita y arma una declaración desde `/logistica/aduana`:
  - `entities/aduana/escritura.ts` (validar lo tipeado, la diferencia que viaja a la base, el tope de la composición) y `repositorio.ts` con `guardar`, `ponerVehiculos` y `asignarCanal`
    (`infra/aduana/declaraciones.ts`, `rpc.ts` con el `hint`→campo), los schemas Zod y las tres actions. Tests: `escritura` (9 ✓), `unidad-buscada` (2 ✓) y `schemas/declaracion` (8 ✓).
  - «Nueva declaración» y «Editar» en `<Drawer>` (borrador, error del número junto al campo, conflicto con «Recargar» que conserva lo escrito); «Vehículos de la declaración» (quitar con deshacer,
    buscador por título, VIN o lote, «Guardar vehículos» en un solo envío); «Asignar canal» / «Cambiar canal» con `<Confirmar>` por `?panel=canal`; la composición queda fija con canal.
  - Guardas: el drawer del formulario (`drawers-con-salida.ts`) y la confirmación del canal (`confirmar-con-url.ts`).
- **Verificación** (`.piloto/salidas/6.09/`): `e2e/logistica-aduana.spec.ts` en escritorio (2 ✓: la persona sin `gestionar` no ve «Nueva declaración»; el camino feliz con dos vehículos, canal, «Pagada» y
  «Tributos pagados: sí»); `vitest` de `src/modules/logistica` y `scripts/guardas` (1425 ✓); `typecheck` y `eslint` sin avisos. Los e2e dirigidos de 6.09-1 no se repiten: no se tocó el panel de la unidad ni el layout.
- **Sin migración, sin auditor** (pantalla, `verde`). El defecto de `declaracion_leer` con un id inexistente (55000 en vez de `P0002`, de 6.07-3) sigue sin tocar: ver `docs/pasos/6.09-1/bitacora.md`.
- **6.09 completo.** Quien integra pasa 6.09 a «hecho» en `docs/PLAN.md`.
- e2e completo: no (6.09-2, Nivel 1: lo prueba el CI del PR; dirigidos: logistica-aduana)
