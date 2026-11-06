'use client'

import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'

type Props = {
  hayMas: boolean
  enElTope: boolean
  cargando: boolean
  // Una movida está en vuelo: el cursor sale de la última fila, y una fila a medio mover tiene el grupo equivocado.
  ocupada: boolean
  alVerMas: () => void
}

// Debajo de la lista: «Ver más» hasta el tope y, en el tope, el aviso. Sin más por leer, nada.
export function PieDeOportunidades({ hayMas, enElTope, cargando, ocupada, alVerMas }: Props) {
  if (!hayMas) {
    return null
  }
  if (enElTope) {
    return (
      <AvisoDeTope
        texto={`Mostrando las ${String(TOPE_DE_LO_CARGADO)} más recientes, las abiertas primero.`}
      />
    )
  }
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 w-fit md:min-h-9"
      onClick={alVerMas}
      disabled={cargando || ocupada}
    >
      {cargando ? 'Cargando…' : 'Ver más'}
    </Button>
  )
}
