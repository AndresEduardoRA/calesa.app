## 6.08-2 — El hueco «Transporte» de la unidad (2026-11-12)

- **D11** (microdecisión) Los campos van en tres `<Bloque>` abiertos (Ruta; Contenedor y booking; Fechas y notas) dentro del bloque del hueco: lo que pide la fila sin esconder nada. Un bloque con un error adentro se fuerza abierto.
- **D12** Sin `logistica.transporte.editar` del origen: los mismos campos apagados con lo guardado y el motivo escrito, sin «Guardar». Mientras `mis_permisos` no llegó, el formulario está apagado.
- **D13** Opciones del selector = lo que ofrece `flujo_oferta` (vacío = todos los activos) más lo ya guardado, siempre visible y rotulado («(inactiva)», «(fuera de la oferta)»): una desactivación no esconde un dato guardado (la base sólo frena lo nuevo).
- **D14** El flujo de la unidad se busca con `flujos` por origen, ámbito y `activo` desde el navegador (precedente `infra/documentos/tipos.client.ts`); no se cambia `Unidad`, que es del núcleo. No hay lector de la oferta para el navegador en `flujos` (es `server-only`): el hueco llama
  `flujo_oferta` y parsea con una copia de `ofertaDesde` (un área no importa otra).
- **D15** El formulario guarda un borrador de los campos tocados, no una copia de la fila: «Recargar» tras un conflicto trae la versión nueva y lo tocado sigue escrito; tras guardar, lo escrito se suelta cuando llega la versión nueva.
- **D16** La validación local repite las reglas de la base con sus mismos textos sólo para ahorrar un viaje, y sólo en lo que cambió; manda la base (su rechazo viaja por `hint`).
- **D17** Sin fila y sin campos tocados, «Guardar» está apagado: no se crea un transporte vacío.
- **D18** Las fechas son `date` (sin hora): `<input type="date">` y `AAAA-MM-DD` tal cual; no pasan por zona ni por `fechas.ts`.
- **D19** La unidad de repuesto no existe aún (8.13): el hueco sólo trata vehículos y, ante un repuesto, lo dice en una línea.
- **D20** Sin migración: la base de 6.07 cubre guardar, la oferta y los rechazos con `hint`.
- **D21** (corrige el plan) La base quita **todo** espacio del contenedor y del booking (`regexp_replace(v, '\s', '', 'g')`) y los pasa a mayúsculas: «ecmu 123» no es un error sino «ECMU123». La validación local hace lo mismo antes de revisar la forma.
