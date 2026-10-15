'use client'

import { UnlinkIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useVinculo } from '../hooks/use-vinculo'
import { ConfirmarDesvincularDiferido } from './diferidos'

type Props = { vehiculo: { id: string; titulo: string; numero: number; actualizadoEn: string } }

// «Desvincular» en la ficha del vehículo, para quien lo puede editar (la base lo vuelve a decidir). Es la
// salida cuando el vehículo está vinculado a un lead que quien mira no tiene en su cartera. Pregunta
// antes: desde acá no hay «Deshacer» (volver a vincular pide la cartera de ese lead).
export function BotonDesvincular({ vehiculo }: Props) {
  const acciones = useVinculo(null)
  const [confirmando, setConfirmando] = useState(false)
  const montar = useAbiertoAlgunaVez(confirmando)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 w-fit md:min-h-8"
        disabled={acciones.enCurso}
        onClick={() => setConfirmando(true)}
      >
        <UnlinkIcon aria-hidden />
        Desvincular
      </Button>
      {montar ? (
        <ConfirmarDesvincularDiferido
          vehiculo={confirmando ? vehiculo : null}
          enCurso={acciones.enCurso}
          alCerrar={() => setConfirmando(false)}
          alConfirmar={() => {
            void acciones
              .desvincular(vehiculo, { deshacer: false })
              .then(() => setConfirmando(false))
          }}
        />
      ) : null}
    </>
  )
}
