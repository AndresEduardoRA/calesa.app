'use client'

import { useRouter } from 'next/navigation'
import { useState, type ComponentProps } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { marcarLaFinal, type FalloDeMarcar } from '../hooks/marcar-la-final'

type Props = {
  abierto: boolean
  alCerrar: () => void
  id: string
  numero: number
  focoAlCerrar: ComponentProps<typeof Confirmar>['focoAlCerrar']
}

const DESCRIPCION =
  'Pasa a ser la final de su vehículo: el vehículo queda vinculado a su lead, el lead pasa a cliente y las demás cotizaciones del vehículo van a tu ' +
  'papelera, de donde se pueden restaurar. Se marca lo guardado: lo que escribiste y no guardaste se pierde.'

// Lo que respondió la base, dicho dentro del diálogo (sin conexión lo dice `Confirmar`). Lo que pide recargar (otra persona la cambió, otra ya es la final,
// no sabemos si entró) ofrece «Recargar»; en ningún caso se marcó nada que no se vea al recargar.
function AvisoDeMarcar(props: { fallo: FalloDeMarcar | null; alRecargar: () => void }) {
  const { fallo, alRecargar } = props
  if (!fallo) {
    return null
  }
  const tono = fallo.error.codigo === 'conflicto' || fallo.error.codigo === 'duplicado'
  return (
    <Aviso tono={tono ? 'aviso' : 'peligro'}>
      <p>{fallo.error.mensaje}</p>
      {fallo.recargar ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 min-h-11 md:min-h-7"
          onClick={alRecargar}
        >
          Recargar
        </Button>
      ) : null}
    </Aviso>
  )
}

// La confirmación de «Marcar final» (4.25-2): nombra la cotización y dice qué pasa con el vehículo, el lead y las demás cotizaciones. Mientras actúa no se
// cierra ni vuelve a enviar. Cuando entra no toca su estado: la página se vuelve a dibujar sin el botón y esto se desmonta (`marcarLaFinal()` ya cerró la URL
// y avisó). Cuando no entra, sigue abierto con el motivo.
export function ConfirmarMarcarFinal({ abierto, alCerrar, id, numero, focoAlCerrar }: Props) {
  const router = useRouter()
  const [enCurso, setEnCurso] = useState(false)
  const [fallo, setFallo] = useState<FalloDeMarcar | null>(null)

  function cerrar() {
    setFallo(null)
    alCerrar()
  }

  async function confirmar() {
    setFallo(null)
    setEnCurso(true)
    const noEntro = await marcarLaFinal({ id, numero, cerrar: alCerrar })
    if (noEntro) {
      setFallo(noEntro)
      setEnCurso(false)
    }
  }

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={cerrar}
      alConfirmar={confirmar}
      titulo={`Marcar como final la cotización n.º ${String(numero)}`}
      descripcion={DESCRIPCION}
      etiquetaConfirmar={enCurso ? 'Marcando…' : 'Marcar final'}
      enCurso={enCurso}
      deshabilitado={fallo?.recargar === true}
      focoAlCerrar={focoAlCerrar}
    >
      <AvisoDeMarcar
        fallo={fallo}
        alRecargar={() => {
          router.refresh()
          cerrar()
        }}
      />
    </Confirmar>
  )
}
