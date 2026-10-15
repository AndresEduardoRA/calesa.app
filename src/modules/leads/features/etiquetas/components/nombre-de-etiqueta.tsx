'use client'

import { useState } from 'react'
import { Input } from '@/shared/ui/input'
import {
  TEXTO_DEL_MOTIVO,
  validarNombreDeEtiqueta,
  type EtiquetaConUso,
} from '../../../entities/etiqueta'

type Props = {
  etiqueta: EtiquetaConUso
  todas: readonly EtiquetaConUso[]
  enCurso: boolean
  // Devuelve el motivo si la base lo rechazó, o null si quedó.
  alGuardar: (nombre: string) => Promise<string | null>
  // El motivo de lo último que se intentó (también de un cambio de color): lo dice este campo.
  motivo: string | null
  alMotivo: (motivo: string | null) => void
}

// El nombre de una etiqueta, editable en el lugar: Enter o salir del campo guarda, Esc vuelve al
// guardado. Lo escrito no se pierde si la base lo rechaza (repetido, conflicto).
export function NombreDeEtiqueta({ etiqueta, todas, enCurso, alGuardar, motivo, alMotivo }: Props) {
  const [nombre, setNombre] = useState(etiqueta.nombre)
  const idMotivo = `motivo-${etiqueta.id}`

  async function guardar() {
    if (nombre.trim() === etiqueta.nombre) {
      setNombre(etiqueta.nombre)
      return
    }
    const valido = validarNombreDeEtiqueta(nombre, todas, etiqueta.id)
    alMotivo(valido.ok ? await alGuardar(valido.nombre) : TEXTO_DEL_MOTIVO[valido.motivo])
  }

  return (
    <>
      <Input
        value={nombre}
        aria-label={`Nombre de la etiqueta ${etiqueta.nombre}`}
        aria-invalid={motivo ? true : undefined}
        aria-describedby={motivo ? idMotivo : undefined}
        maxLength={40}
        disabled={enCurso}
        className="h-11 min-w-0 flex-1 md:h-8"
        onChange={(evento) => {
          setNombre(evento.target.value)
          alMotivo(null)
        }}
        onBlur={() => void guardar()}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault()
            void guardar()
          } else if (evento.key === 'Escape' && nombre !== etiqueta.nombre) {
            evento.stopPropagation()
            setNombre(etiqueta.nombre)
            alMotivo(null)
          }
        }}
      />
      {motivo ? (
        <p
          id={idMotivo}
          role="alert"
          className="order-last basis-full text-(length:--text-xs) text-(--color-peligro-ink)"
        >
          {motivo}
        </p>
      ) : null}
    </>
  )
}
