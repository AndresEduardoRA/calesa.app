'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de anotar y editar se pide recién al abrirse (y con él, el editor): la línea de tiempo no
// carga su código para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeSeguimientoDiferido = diferido(() =>
  import('./modal-de-seguimiento').then((modulo) => modulo.ModalDeSeguimiento),
)

// Lo de una línea larga («Ir a una fecha», «Desde el …», el aviso del tope) se pide al dibujarse: la
// línea de tiempo casi nunca lo usa.
const ventana = () => import('./ventana-de-la-linea')
export const IrAUnaFechaDiferido = diferido(() => ventana().then((m) => m.IrAUnaFecha), {
  aviso: 'aqui',
})
export const DesdeUnaFechaDiferido = diferido(() => ventana().then((m) => m.DesdeUnaFecha), {
  aviso: 'aqui',
})
export const AvisoDelTopeDiferido = diferido(() => ventana().then((m) => m.AvisoDelTope), {
  aviso: 'aqui',
})
