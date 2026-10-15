'use client'

import { useState } from 'react'
import { Confirmar } from '@/shared/ui/confirmar'
import { ETIQUETA_DE_SALIR } from '../../../entities/cartera'
import type { CarteraDelLead } from '../hooks/use-cartera'

type Props = {
  abierto: boolean
  alCerrar: () => void
  leadNombre: string
  cartera: CarteraDelLead
}

// «Salir de este lead»: nombra el lead y dice qué se pierde. Si la base lo rechaza (el dueño, o el
// único que lo tiene) lo dice adentro y el diálogo sigue abierto.
export function DialogoDeSalir({ abierto, alCerrar, leadNombre, cartera }: Props) {
  const [error, setError] = useState<string | null>(null)
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={() => {
        setError(null)
        alCerrar()
      }}
      alConfirmar={() => {
        void cartera.salir().then((envio) => {
          if (envio.ok) {
            alCerrar()
          } else {
            setError(envio.error.mensaje)
          }
        })
      }}
      titulo={`Salir de «${leadNombre}»`}
      descripcion="Dejarás de ver este lead y sus datos. Para volver a tenerlo, quien lo tiene tendrá que compartírtelo otra vez."
      etiquetaConfirmar={ETIQUETA_DE_SALIR}
      enCurso={cartera.enCurso}
    >
      {error ? (
        <p role="alert" className="text-(length:--text-sm)">
          {error}
        </p>
      ) : null}
    </Confirmar>
  )
}
