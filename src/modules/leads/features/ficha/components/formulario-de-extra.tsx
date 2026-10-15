'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import type { LeadDeFicha, TelefonoExtra } from '../../../entities/ficha'
import { CLAVE_DE_TELEFONO, LARGO_MAXIMO_DE_ETIQUETA } from '../../../entities/telefonos'
import { useFormularioDeExtra } from '../hooks/use-formulario-de-extra'
import type { TelefonosExtra } from '../hooks/use-telefonos-extra'

type Props = {
  ficha: LeadDeFicha
  extras: readonly TelefonoExtra[]
  guardar: TelefonosExtra['guardar']
  alCerrar: () => void
}

const IDS = {
  telefono: 'lead-extra-nuevo-telefono',
  etiqueta: 'lead-extra-nuevo-etiqueta',
} as const

// «Agregar teléfono» en línea, dentro del bloque: el número y su etiqueta (opcional). Enter confirma
// y Esc cancela. El número se normaliza como el del alta, con el código de país del lead.
export function FormularioDeExtra(props: Props) {
  const { alCerrar } = props
  const formulario = useFormularioDeExtra(props)
  const raiz = useRef<HTMLFormElement>(null)

  // En el celular el teclado tapa el campo: se trae a la vista al abrir.
  useEffect(() => {
    raiz.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <form
      ref={raiz}
      noValidate
      className="grid gap-2 rounded-(--radius-card) border border-(--color-line) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void formulario.enviar()
      }}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') {
          evento.stopPropagation()
          alCerrar()
        }
      }}
    >
      <Campo
        nombre={IDS.telefono}
        etiqueta="Teléfono extra"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        autoFocus
        value={formulario.telefono}
        onChange={(evento) => {
          formulario.escribirTelefono(evento.target.value)
        }}
        error={formulario.errores[CLAVE_DE_TELEFONO.telefono]}
        ayuda={formulario.comoSeGuarda ? `Se guardará como ${formulario.comoSeGuarda}.` : undefined}
        disabled={formulario.enCurso}
      />
      <Campo
        nombre={IDS.etiqueta}
        etiqueta="Etiqueta (opcional)"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_ETIQUETA + 20}
        value={formulario.etiqueta}
        onChange={(evento) => {
          formulario.escribirEtiqueta(evento.target.value)
        }}
        error={formulario.errores[CLAVE_DE_TELEFONO.etiqueta]}
        disabled={formulario.enCurso}
      />
      {formulario.aviso ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {formulario.aviso}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 md:min-h-8"
          onClick={alCerrar}
          disabled={formulario.enCurso}
        >
          Cancelar
        </Button>
        <Button type="submit" className="min-h-11 md:min-h-8" disabled={formulario.enCurso}>
          {formulario.enCurso ? 'Agregando…' : 'Agregar'}
        </Button>
      </div>
    </form>
  )
}
