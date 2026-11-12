## 2026-11-11 — 5.04-3: el inspector › Datos

D1 a D17 del plan padre (`.piloto/planes/5.04.md`) quedan cumplidas con esta parte. Lo que se decidió o se precisó aquí (`.piloto/planes/5.04-3.md`, D18 a D25):

- **D18 · Un solo bloque «Datos» con cinco `<Bloque>`s adentro** (Identidad abierto, el resto plegado; uno con un error se fuerza abierto). No se tocó `inspector-de-fase.tsx` más allá de D17: sin hueco, sigue la lectura.
- **D19 · Sin `diferido()` propio:** el inspector ya se pide al abrirse y el formulario viaja en su chunk. `presupuesto-js` no se corrió (el CI lo marca si pasa).
- **D20 · Una jubilada se edita** (la base lo acepta) y arriba dice que no es destino de ningún cambio.
- **D21 · Con errores locales no se llama a la base** (`validarFase`); el error de la base con su `hint` se pinta igual. Foco al primer campo con error en orden visual; el foco de un interruptor va a su botón (la tarjeta lleva el `id` y se busca el primer control adentro).
- **D22 · Tras guardar** el panel queda abierto con «Fase «X» guardada.»; el formulario se reinicia con `key` (`fase.id` + versión). Entre el envío y la llegada, todo apagado a mano.
- **D23 · El motivo del interruptor apagado va en su ayuda** (`<InterruptorConMotivo>`); «Es inicial» avisa, sin bloquear, si otra fase activa ya lo es.
- **D24 · «Llegada de repuestos»** en los dos ámbitos; su ayuda dice que sólo una fase por flujo puede contarla.
- **D25 · «Nombre para el cliente»** es obligatorio con «Visible en el portal» encendido y no se borra al apagarlo.
- **Pie del formulario con `<PieDelPanel>`** (no un pie propio): toma la salida del `<Drawer>` por contexto, así un aviso que sale de la pantalla con cambios sin guardar pregunta en el mismo pie. «Cancelar» vuelve a lo guardado y tira el borrador.
- **Se agregó `campo-de-texto-largo.tsx`** (etiqueta, ayuda y error sobre `<Textarea>`): `Campo` sólo cubre una línea y la descripción se usa dos veces. `use-valores-de-fase.ts` sí se partió del hook (el lint pide ≤ 80 líneas por función).
- **El e2e:** la siembra del historial va por SQL (`historial_fases`), como la prueba `fases-eliminar.sql`; el spec quita lo sembrado también al empezar, porque una corrida caída lo dejaba y frenaba el borrado del origen.
