'use client'

import { diferido } from '@/shared/ui/diferido'

// El diálogo de emitir y el modal de anular se piden la primera vez que se abren (`useAbiertoAlgunaVez()`): la guardada no los carga para dibujarse (su JS en
// frío está al tope, `e2e/presupuesto-js.spec.ts`).
export const ConfirmarEmitirComprobanteDiferido = diferido(() =>
  import('./confirmar-emitir-comprobante').then((modulo) => modulo.ConfirmarEmitirComprobante),
)

export const ModalDeAnularDiferido = diferido(
  () => import('./modal-de-anular').then((modulo) => modulo.ModalDeAnular),
  { aviso: 'pantalla' },
)
