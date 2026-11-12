## 2026-11-12 — Paso 6.06-3: revisar, editar, eliminar y subir a un grupo

- **D20 · Sin identidad en el navegador, «Editar» y «Eliminar» se ofrecen a quien tiene aprobar o subir** (lo mínimo que la base pide) y la base decide: un `42501` se dice dentro de la fila o del
  diálogo. Reversible: si hace falta apagarlo antes, se lee el uid con `getClaims()` en un `infra/…client.ts`.
- **D21 · «Aprobar» sale en un documento «Subido» o «Rechazado»; «Rechazar» sólo en «Subido».** Un aprobado que se quiere deshacer se elimina y se sube de nuevo (la base permitiría rechazarlo, no se ofrece).
- **D22 · El motivo del rechazo se escribe junto al botón** (1 a 500, recortado); vacío apaga «Confirmar rechazo» y dice por qué. Un `PT409` lo conserva porque la fila no se desmonta al releer.
- **D23 · «Visible en el portal» es un interruptor por fila**, apagado con motivo sin la clave de aprobar o si el tipo no lo admite. Apagar siempre se puede; uno visible de un tipo que ya no lo admite queda
  encendido y dice «No se ve en el portal: el tipo ya no lo permite.» (D13 de 6.05).
- **D24 · «Editar» es un formulario dentro de la fila**, sin `<Drawer>` (así no hay guarda de salida nueva); «Guardar» manda sólo lo que cambió y está apagado si nada cambió.
- **D25 · El hueco del grupo reutiliza la bandeja:** cada archivo se sube una vez a la carpeta de la primera unidad (la de menor id, para que un reintento caiga en la misma ruta) y se registra para todas.
  Más de 100 unidades: se apaga con «Este grupo tiene más de 100 unidades: súbelo por partes.».
- **D26 · Los tipos del grupo son los de la primera unidad** (globales y del flujo de su origen); si otra unidad es de otro flujo y la base rechaza el tipo, el motivo sale junto al archivo.
- **D27 · El hueco del grupo no tiene e2e** (no existe página de grupo): lo prueba un test de componente; su e2e llegará cuando 6.08 o 6.09 lo monten.
- **D28 · Quien aprueba en el e2e lleva también `flujos.mover`:** sin esa clave «Qué falta» no ofrece el destino y no se puede ver el requisito cumplido.
