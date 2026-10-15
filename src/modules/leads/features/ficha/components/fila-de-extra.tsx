'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import type { TelefonoExtra } from '../../../entities/ficha'
import { LARGO_MAXIMO_DE_ETIQUETA } from '../../../entities/telefonos'
import { useRotularExtra } from '../hooks/use-rotular-extra'
import type { TelefonosExtra } from '../hooks/use-telefonos-extra'
import { NumeroDeTelefono } from './numero-de-telefono'

type Props = {
  extra: TelefonoExtra
  codigoDePais: string | null
  llamable: boolean
  // Sin esto es una línea de sólo lectura (quien no tiene el lead en su cartera).
  acciones: {
    guardar: TelefonosExtra['guardar']
    quitar: TelefonosExtra['quitar']
    enCurso: boolean
  } | null
}

// Rotular en línea: la etiqueta, con Enter que confirma y Esc que cancela. El número no cambia (para
// otro número se quita éste y se agrega el nuevo).
function RotularEnLinea(props: {
  extra: TelefonoExtra
  guardar: TelefonosExtra['guardar']
  alCerrar: () => void
}) {
  const { extra, alCerrar } = props
  const rotulo = useRotularExtra(props)
  return (
    <form
      noValidate
      className="flex flex-wrap items-end gap-2"
      onSubmit={(evento) => {
        evento.preventDefault()
        void rotulo.enviar()
      }}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') {
          evento.stopPropagation()
          alCerrar()
        }
      }}
    >
      <div className="min-w-40 flex-1">
        <Campo
          nombre={`lead-extra-${extra.id}-etiqueta`}
          etiqueta="Etiqueta"
          autoComplete="off"
          autoFocus
          maxLength={LARGO_MAXIMO_DE_ETIQUETA + 20}
          value={rotulo.etiqueta}
          onChange={(evento) => {
            rotulo.escribir(evento.target.value)
          }}
          error={rotulo.error}
          disabled={rotulo.enCurso}
        />
      </div>
      <Button type="submit" size="sm" className="min-h-11 md:min-h-8" disabled={rotulo.enCurso}>
        Guardar
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="min-h-11 md:min-h-8"
        onClick={alCerrar}
        disabled={rotulo.enCurso}
      >
        Cancelar
      </Button>
    </form>
  )
}

// Un teléfono extra: su número y su etiqueta; con la cartera, «Rotular» y «Quitar».
export function FilaDeExtra({ extra, codigoDePais, llamable, acciones }: Props) {
  const [rotulando, setRotulando] = useState(false)
  if (acciones && rotulando) {
    return (
      <li className="grid gap-1">
        <NumeroDeTelefono numero={extra.telefono} codigoDePais={codigoDePais} llamable={false} />
        <RotularEnLinea
          extra={extra}
          guardar={acciones.guardar}
          alCerrar={() => {
            setRotulando(false)
          }}
        />
      </li>
    )
  }
  return (
    <li className="flex flex-wrap items-center gap-x-2">
      <NumeroDeTelefono numero={extra.telefono} codigoDePais={codigoDePais} llamable={llamable} />
      {extra.etiqueta ? (
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">{extra.etiqueta}</span>
      ) : null}
      {acciones ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 md:min-h-7"
            disabled={acciones.enCurso}
            onClick={() => {
              setRotulando(true)
            }}
          >
            {extra.etiqueta ? 'Rotular' : 'Poner etiqueta'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 md:min-h-7"
            disabled={acciones.enCurso}
            onClick={() => {
              void acciones.quitar(extra)
            }}
          >
            Quitar
          </Button>
        </>
      ) : null}
    </li>
  )
}
