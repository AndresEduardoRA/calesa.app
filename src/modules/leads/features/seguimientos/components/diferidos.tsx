'use client'

import dynamic from 'next/dynamic'

// El modal de anotar y editar se pide recién al abrirse (y con él, el editor): la línea de tiempo no
// carga su código para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeSeguimientoDiferido = dynamic(
  () => import('./modal-de-seguimiento').then((modulo) => modulo.ModalDeSeguimiento),
  { ssr: false },
)

// Lo de una línea larga («Ir a una fecha», «Desde el …», el aviso del tope) se pide al dibujarse: la
// línea de tiempo viaja en el JS de todas las pantallas por la entrada del módulo, y casi nunca se usa.
const ventana = () => import('./ventana-de-la-linea')
export const IrAUnaFechaDiferido = dynamic(() => ventana().then((m) => m.IrAUnaFecha), {
  ssr: false,
})
export const DesdeUnaFechaDiferido = dynamic(() => ventana().then((m) => m.DesdeUnaFecha), {
  ssr: false,
})
export const AvisoDelTopeDiferido = dynamic(() => ventana().then((m) => m.AvisoDelTope), {
  ssr: false,
})
