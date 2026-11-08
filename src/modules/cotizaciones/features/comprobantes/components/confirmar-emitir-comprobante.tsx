'use client'

import { useRouter } from 'next/navigation'
import { useState, type ComponentProps } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { emitirElComprobante, type FalloDeEmitir } from '../hooks/emitir-el-comprobante'

type Props = {
  abierto: boolean
  alCerrar: () => void
  cotizacionId: string
  numero: number
  actualizadoEn: string
  focoAlCerrar: ComponentProps<typeof Confirmar>['focoAlCerrar']
}

const DESCRIPCION =
  'Se numera con la serie vigente y congela lo que ve de esta cotización cualquiera que tenga acceso a ella (sin costos). No se borra: si hace falta, se ' +
  'anula con un motivo y su número no se vuelve a usar. Se emite lo guardado: lo que escribiste y no guardaste no entra.'

// Lo que respondió la base, dicho dentro del diálogo (sin conexión lo dice `Confirmar`). Lo que pide recargar ofrece «Recargar».
function AvisoDeEmitir(props: { fallo: FalloDeEmitir | null; alRecargar: () => void }) {
  const { fallo, alRecargar } = props
  if (!fallo) {
    return null
  }
  return (
    <Aviso tono={fallo.error.codigo === 'conflicto' ? 'aviso' : 'peligro'}>
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

// La confirmación de «Emitir comprobante» (4.26-2): dice qué se congela y que no se borra. Mientras emite no se cierra ni vuelve a enviar (un doble clic no
// emite dos: la base da PT409 sin gastar número). Cuando entra, la página se vuelve a dibujar sin el botón y esto se desmonta; cuando no, sigue abierto con el
// motivo.
export function ConfirmarEmitirComprobante({
  abierto,
  alCerrar,
  cotizacionId,
  numero,
  actualizadoEn,
  focoAlCerrar,
}: Props) {
  const router = useRouter()
  const [enCurso, setEnCurso] = useState(false)
  const [fallo, setFallo] = useState<FalloDeEmitir | null>(null)

  function cerrar() {
    setFallo(null)
    alCerrar()
  }

  async function confirmar() {
    setFallo(null)
    setEnCurso(true)
    const noEntro = await emitirElComprobante({ cotizacionId, actualizadoEn, cerrar: alCerrar })
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
      titulo={`Emitir un comprobante de la cotización n.º ${String(numero)}`}
      descripcion={DESCRIPCION}
      etiquetaConfirmar={enCurso ? 'Emitiendo…' : 'Emitir comprobante'}
      enCurso={enCurso}
      deshabilitado={fallo?.recargar === true}
      focoAlCerrar={focoAlCerrar}
    >
      <AvisoDeEmitir
        fallo={fallo}
        alRecargar={() => {
          router.refresh()
          cerrar()
        }}
      />
    </Confirmar>
  )
}
