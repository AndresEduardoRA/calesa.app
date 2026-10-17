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

// «Salir de este lead» (`?panel=salir-lead`): nombra el lead y dice qué se pierde. Si la base lo rechaza (el dueño, o el
// único que lo tiene) lo dice adentro y el diálogo sigue abierto.
export function DialogoDeSalir({ abierto, alCerrar, leadNombre, cartera }: Props) {
  const [error, setError] = useState<string | null>(null)
  // Salió: la pantalla se va sola al listado. Cerrar el panel escribiría la URL justo después de esa navegación y la pisaría.
  const [salio, setSalio] = useState(false)
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={() => {
        setError(null)
        alCerrar()
      }}
      alConfirmar={() =>
        cartera.salir().then((envio) => {
          if (envio.ok) {
            setSalio(true)
          } else {
            setError(envio.error.mensaje)
          }
        })
      }
      titulo={`Salir de «${leadNombre}»`}
      descripcion="Dejarás de ver este lead y sus datos. Para volver a tenerlo, quien lo tiene tendrá que compartírtelo otra vez."
      etiquetaConfirmar={ETIQUETA_DE_SALIR}
      enCurso={cartera.enCurso || salio}
    >
      {error ? (
        <p role="alert" className="text-(length:--text-sm)">
          {error}
        </p>
      ) : null}
    </Confirmar>
  )
}
