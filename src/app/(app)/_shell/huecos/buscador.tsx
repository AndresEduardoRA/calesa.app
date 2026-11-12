'use client'

import { useState } from 'react'
import { AyudaDeAtajos } from '@/shared/ui/atajos'
import { BuscadorPendiente } from '../buscador-pendiente'

// El hueco del buscador global. Hoy es el botón deshabilitado más la lista de atajos (`?`); la paleta (7.13-3) reemplaza el botón.
export function HuecoBuscador() {
  const [atajos, setAtajos] = useState(false)
  return (
    <>
      <BuscadorPendiente />
      <AyudaDeAtajos abierta={atajos} alCambiar={setAtajos} />
    </>
  )
}
