## 2026-11-11 — Paso 5.08: «Requisitos para entrar» (decisiones de la parte 1)

- **D1 · Clave con regla apagada:** se ofrece con la nota «La regla «X» está apagada: nadie podrá cumplirlo.» y no se bloquea (la base la acepta). Los nombres de
  regla (`transporte`, `aduana`, `pagos`) salen del prefijo de la clave; confirmados contra `flujos_reglas_regla_check`.
- **D2 · El selector excluye las claves que la fase ya pide:** la base permite repetirlas, pero no tiene sentido; si ya las pide todas, «Agregar requisito» queda
  apagado con su motivo.
- **D3 · Los nombres que el bloque necesita se leen por una Server Action de lectura**, una vez por flujo y guardados un minuto: el hueco `bloques.requisitos` es de
  cliente y sólo recibe `{flujo, fase}`, y ampliarlo con datos rompería a 5.04 y 5.06, que lo comparten.
- **D4 · «Agregar requisito» es en línea dentro del bloque** (`?agregar=dato`), no un modal dentro del drawer (`ui.md`). La confirmación de quitar usa
  `?eliminar=requisito&quitar=<id>` para no ocupar `?panel=` ni `?fase=`.
- **D5 · El inspector sigue registrado `sinFormulario`** en `drawers-con-salida.ts`: la guarda no pidió otra cosa. El formulario avisa los cambios sin guardar con
  `useCambiosSinGuardar({ preguntaAlCerrar: true })`.
- **D6 · `LecturaDeRequisitos` (núcleo) queda arriba como resumen** y el bloque agrega la lista debajo.
- **D7 · Cada action lleva el `ambito` del flujo** para exigir `flujos.configurar` o `repuestos.configurar` antes de la RPC; la base lo vuelve a exigir.
- **D8 · Los tipos de documento se leen en `infra/requisitos/opciones.ts`, no de `documentos`:** un área no importa otra (`areas-de-flujos.test.ts`).
