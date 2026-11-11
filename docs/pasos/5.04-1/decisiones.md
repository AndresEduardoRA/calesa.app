## 2026-11-11 — 5.04-1: las fases, lo puro y las actions

Las decisiones D1 a D17 del plan (`.piloto/planes/5.04.md`) siguen en pie; esta parte (sin interfaz) cumple las que tocan lo puro y la escritura. Lo que
cambió o se precisó al escribirlas:

- **D2 afinada · `flujoId` sólo en crear.** Las demás RPC reciben la fase y la base saca su flujo; sólo `fase_crear(p_id, p_flujo, …)` necesita el
  `flujoId`. Todas las actions llevan `origenId` (nulo = repuestos) para exigir el permiso antes de escribir: `puede(permisos, 'flujos.configurar',
origenId)` o `puede(permisos, 'repuestos.configurar')`. Es la primera llave; la base (`puede_configurar_flujo`) vuelve a exigirlo y manda.
- **D3 · La lectura del impacto es la action `leerImpactoDeUnaFase`** (no escribe, no revalida). El área `fases` no tiene lectura propia: la lista y el
  inspector leen del núcleo (`leerFlujoParaConfigurar`).
- **D5 y C6 · «unidades», no «vehículos».** `fase_impacto().paradas` suma vehículos e ítems de repuestos (también en la papelera): el texto dice
  «N unidades siguen en ella» (el término ya está en el módulo), con «más de 50» en el tope.
- **Crear no es idempotente por id.** `fase_crear` no devuelve «repetido» como los tipos de documento: repetir el id del intento da `23505` con el
  texto «Esa fase ya existe.» (`hint = id`, que no es un campo del formulario). La interfaz (5.04-2) usa un id nuevo por apertura del modal y, si el
  intento se repite tras un corte, relee la lista antes de reintentar.
- **Revalidación.** Cada escritura revalida `RUTAS.configuracionDeFlujos` y `RUTAS.vehiculos` (`'layout'`): `vehiculos` lee `leerFasesDeOrigen`.
  Lo hace la action, no el repositorio.
- **Tipos de `database.types.ts`.** `fase_mover` y `fase_crear` no admiten nulo en `p_despues_de`; se castea en el repositorio (nulo = primera), igual
  que el 5.09.
- **Prueba contra la base (D11 del 5.09, opcional recomendada): hecha.** `reglas-de-fase-contra-la-base.test.ts` corre `_fase_validar()` real en PGlite
  (tabla mínima + `flujo_regla_activa` de tabla) sobre 26 casos y exige el mismo campo en el `hint` y el mismo texto que `validarFase()`. Sólo
  `_fase_validar`: `_fase_forma` (la forma) y `_fase_unico` los prueba `supabase/tests/areas/flujos/fases*.sql`.
- **Paleta de color (D7):** `Azul #465fff`, `Violeta #7a5af8`, `Cobre #c7680a`, `Turquesa #0e7490`, `Rojo #f04438`, `Naranja #f79009`, `Verde #027a48`,
  `Gris #717c93` (el neutro de `fase_crear`). Los nombres son de esta pantalla, no de la base.
