'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Confirmar } from '@/shared/ui/confirmar'
import {
  CANALES_DE_AFORO,
  esCanalDeAforo,
  textoDelCanal,
  type CanalDeAforo,
  type DeclaracionLeida,
} from '../../../entities/aduana/declaracion'

type Props = {
  declaracion: DeclaracionLeida
  abierto: boolean
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  asignar: (canal: CanalDeAforo) => Promise<ErrorApp | null>
  alCerrar: () => void
}

// La confirmación de asignar el canal de aforo (`?panel=canal&declaracion=<id>`): elige el canal **dentro** del diálogo y avisa que la composición queda fija. «Cambiar canal» (de uno a otro)
// pasa por el mismo diálogo; el canal no se quita. Si la base lo rechaza, lo dice adentro y no se cierra; un conflicto ofrece «Recargar».
export function ConfirmarAsignarCanal({ declaracion, abierto, asignar, alCerrar }: Props) {
  const router = useRouter()
  const [canal, setCanal] = useState<string>(declaracion.canal ?? '')
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function confirmar() {
    if (!esCanalDeAforo(canal)) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await asignar(canal)
    setEnCurso(false)
    if (rechazo === null) {
      cerrar()
    } else {
      setError(rechazo)
    }
  }

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={cerrar}
      alConfirmar={confirmar}
      titulo={`${declaracion.canal ? 'Cambiar el canal de' : 'Asignar canal a'} la declaración ${declaracion.numero}`}
      descripcion="Al asignar el canal, la composición queda fija: no podrás agregar ni quitar vehículos."
      etiquetaConfirmar={declaracion.canal ? 'Cambiar canal' : 'Asignar canal'}
      enCurso={enCurso}
      deshabilitado={!esCanalDeAforo(canal)}
    >
      <CampoSeleccion
        nombre="declaracion-canal"
        etiqueta="Canal de aforo"
        opciones={[
          { valor: '', etiqueta: 'Elige un canal' },
          ...CANALES_DE_AFORO.map((c) => ({ valor: c, etiqueta: textoDelCanal(c) })),
        ]}
        value={canal}
        onChange={(evento) => {
          setCanal(evento.target.value)
          setError(null)
        }}
        disabled={enCurso}
      />
      {error ? (
        <Aviso tono="peligro">
          <p>{error.mensaje}</p>
          {error.codigo === 'conflicto' ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 min-h-11 md:min-h-7"
              onClick={() => {
                setError(null)
                router.refresh()
              }}
            >
              Recargar
            </Button>
          ) : null}
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
