'use client'

import { diferido } from '@/shared/ui/diferido'

// El diálogo de «Marcar final» se pide la primera vez que se abre (`useAbiertoAlgunaVez()`): la guardada no lo carga para dibujarse.
export const ConfirmarMarcarFinalDiferido = diferido(() =>
  import('./confirmar-marcar-final').then((modulo) => modulo.ConfirmarMarcarFinal),
)
