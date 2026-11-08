## 2026-11-08 — Paso 4.26-2 y 4.26-3 (microdecisiones de UX; ninguna pregunta a la persona)

- La sección «Comprobantes» se dibuja sólo en una final o en una cotización que ya tiene alguno (una final que bajó a preventa con sólo anulados, P7 a). En una
  preventa sin comprobantes no gana ni un nodo.
- Anular abre un `ModalDeFormulario` (lleva un motivo tipeado), no un `<Confirmar>`; emitir, un `<Confirmar>` (no hay nada que tipear).
- `?panel=anular-comprobante` no lleva el id: hay a lo sumo un vigente (P2 a) y la isla lo recibe del servidor.
- «Emitir comprobante» sólo en una final **activa** (una reportada o inválida no lo ve): lo pide la partición del 4.26 y lo dijo la auditoría del plan.
- La lista se lee en el servidor tras `<Suspense>` y no se mide con volumen: no crece con el uso (un vigente y los anulados de una sola cotización), como los
  adjuntos (≤ 20).
- Los textos de error de `comprobante_emitir`, `comprobante_anular` y `comprobantes_serie_cambiar` se muestran tal cual (excepción anotada en la ficha del
  módulo): la base ya los escribe para la persona.
- El PT409 de la serie en Empresa va por el aviso con «Recargar» (`avisarError`), como el otro formulario con versión de Configuración.
