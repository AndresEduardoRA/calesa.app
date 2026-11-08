'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { MAXIMO_DEL_NOMBRE_DE_MODO } from '../../../entities/diseno/edicion-de-la-cabecera'

type Props = {
  // Por qué no se puede sumar un modo; nulo: se puede.
  motivo: string | null
  ocupado: boolean
  alSumar: (nombre: string) => void
}

// «Sumar un modo»: el nombre y un botón que crea el modo copiando los tipos de cambio de la fórmula; después se cambian en el modo.
export function SumarUnModo({ motivo, ocupado, alSumar }: Props) {
  const [nombre, setNombre] = useState('')
  const sinNombre = nombre.trim() === ''
  return (
    <div className="grid min-w-0 gap-2 @md:grid-cols-[minmax(0,1fr)_auto] @md:items-end">
      <Campo
        nombre="sumar-modo-nombre"
        etiqueta="Nombre del modo"
        maxLength={MAXIMO_DEL_NOMBRE_DE_MODO}
        value={nombre}
        disabled={ocupado || motivo !== null}
        ayuda={motivo ?? undefined}
        onChange={(evento) => {
          setNombre(evento.target.value)
        }}
      />
      <Button
        variant="outline"
        disabled={ocupado || motivo !== null || sinNombre}
        onClick={() => {
          alSumar(nombre)
          setNombre('')
        }}
      >
        Sumar un modo
      </Button>
    </div>
  )
}
