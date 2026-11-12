'use client'

import { useState } from 'react'
import { Buscador, type AccionDeLaPaleta } from '@/modules/buscador/shell.client'
import { useAbrirNuevoLead } from '@/modules/leads/shell.client'
import { AyudaDeAtajos } from '@/shared/ui/atajos'

// El hueco del buscador global: el botón con su paleta (`Ctrl/Cmd+K`) y la lista de atajos (`?`). Une los dos módulos que la paleta necesita sin que se importen entre sí:
// «Nuevo lead» es de `leads` y «Ver atajos» abre la lista de acá. Las acciones llegan ya filtradas por `puede()` desde el layout.
export function HuecoBuscador({ acciones }: { acciones: readonly AccionDeLaPaleta[] }) {
  const abrirNuevoLead = useAbrirNuevoLead()
  const [atajos, setAtajos] = useState(false)
  return (
    <>
      <Buscador
        acciones={acciones}
        alAbrirNuevoLead={abrirNuevoLead}
        alVerAtajos={() => {
          setAtajos(true)
        }}
      />
      <AyudaDeAtajos abierta={atajos} alCambiar={setAtajos} />
    </>
  )
}
