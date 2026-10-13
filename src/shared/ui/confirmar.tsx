'use client'

import { useId, useState, type ReactNode } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Modal } from './modal'

type Props = {
  abierto: boolean
  alCerrar: () => void
  alConfirmar: () => void
  // «Eliminar el rol Logística»: la acción y el nombre del objeto, nunca «¿Estás seguro?».
  titulo: string
  // Qué se pierde y que no se puede deshacer.
  descripcion: string
  etiquetaConfirmar: string
  enCurso?: boolean
  // Para lo masivo e irreversible: hay que tipear esta palabra para habilitar el botón.
  palabraClave?: string
  // No se puede confirmar ahora (sin conexión): el diálogo sigue abierto y lo dice en `children`.
  deshabilitado?: boolean
  // Lo que pasó con el intento (sin conexión, otra persona lo cambió): un `<Aviso>` dentro del
  // diálogo, que no se cierra hasta que la persona decide.
  children?: ReactNode
}

// Confirmación de lo irreversible. Lo reversible no pasa por acá: se hace y se ofrece «Deshacer»
// (`avisarConDeshacer`). Nunca `window.confirm`.
export function Confirmar({
  abierto,
  alCerrar,
  alConfirmar,
  titulo,
  descripcion,
  etiquetaConfirmar,
  enCurso = false,
  palabraClave,
  deshabilitado = false,
  children,
}: Props) {
  const idCampo = useId()
  const [tipeado, setTipeado] = useState('')
  const falta = palabraClave !== undefined && tipeado.trim() !== palabraClave

  function cerrar() {
    setTipeado('')
    alCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={cerrar}
      titulo={titulo}
      descripcion={descripcion}
      pie={
        <>
          <Button variant="outline" onClick={cerrar} disabled={enCurso}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={alConfirmar}
            disabled={enCurso || falta || deshabilitado}
          >
            {etiquetaConfirmar}
          </Button>
        </>
      }
    >
      {children}
      {palabraClave !== undefined ? (
        <div className="grid gap-2">
          <Label htmlFor={idCampo}>Para confirmar, escribir «{palabraClave}»</Label>
          <Input
            id={idCampo}
            value={tipeado}
            autoComplete="off"
            onChange={(evento) => {
              setTipeado(evento.target.value)
            }}
          />
        </div>
      ) : null}
    </Modal>
  )
}
