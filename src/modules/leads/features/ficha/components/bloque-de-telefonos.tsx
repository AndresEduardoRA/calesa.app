'use client'

import { Bloque } from '@/shared/ui/bloque'
import type { LeadDeFicha } from '../../../entities/ficha'
import { BotonCambiarTelefono } from './boton-cambiar-telefono'
import { NumeroDeTelefono } from './numero-de-telefono'
import { TelefonosExtra } from './telefonos-extra'

type Props = {
  ficha: LeadDeFicha
  // Quien mira tiene el lead en su cartera y puede editarlo: sin esto no hay acciones.
  puedeCambiar: boolean
}

// El teléfono principal y los extras, cada uno con su etiqueta. La base ya entregó cada número como
// corresponde: completo para la cartera y enmascarado para el resto; acá sólo se dice. Con la
// cartera se cambia el principal y se administran los extras; sin ella no hay ninguna acción.
export function BloqueDeTelefonos({ ficha, puedeCambiar }: Props) {
  const { enCartera, telefonoCc } = ficha
  return (
    <Bloque titulo="Teléfonos">
      <ul className="grid gap-2 text-(length:--text-sm) text-(--color-ink)">
        <li className="flex flex-wrap items-center gap-x-2">
          <NumeroDeTelefono
            numero={ficha.telefono}
            codigoDePais={telefonoCc}
            llamable={enCartera}
          />
          <span className="text-(length:--text-xs) text-(--color-ink-soft)">Principal</span>
          {puedeCambiar ? <BotonCambiarTelefono /> : null}
        </li>
        <TelefonosExtra ficha={ficha} puedeAdministrar={puedeCambiar} />
      </ul>
      {enCartera ? null : (
        <p className="mt-3 text-(length:--text-xs) text-(--color-ink-soft)">
          Completo solo para su cartera.
        </p>
      )}
    </Bloque>
  )
}
