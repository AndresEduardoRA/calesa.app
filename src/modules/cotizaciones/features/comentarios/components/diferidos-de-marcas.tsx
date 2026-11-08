'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de reportar y el Confirmar de moderar se piden al abrirse (4.27-4): la guardada no los carga para dibujarse (su JS en frío está cerca del tope).
export const ModalDeReportarDiferido = diferido(
  () => import('./modal-de-reportar').then((modulo) => modulo.ModalDeReportar),
  { aviso: 'pantalla' },
)

export const ConfirmarModeracionDiferido = diferido(
  () => import('./confirmar-moderacion').then((modulo) => modulo.ConfirmarModeracion),
  { aviso: 'pantalla' },
)
