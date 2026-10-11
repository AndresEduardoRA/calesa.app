'use client'

import { useState } from 'react'

// Un panel o un diálogo controlado por la URL se queda sin su dato en el instante en que se
// cierra, pero tarda un momento en irse de la pantalla. Esto conserva el último dato que tuvo,
// para que no se vacíe mientras se cierra. El valor tiene que ser estable entre renders (una
// fila que vino por props, no un objeto armado en el momento).
export function useUltimo<Valor>(valor: Valor | null): Valor | null {
  const [ultimo, setUltimo] = useState(valor)
  if (valor !== null && valor !== ultimo) {
    setUltimo(valor)
  }
  return valor ?? ultimo
}
