'use client'

import { Bloque } from '@/shared/ui/bloque'
import type { LeadDeFicha } from '../../../entities/ficha'
import { telefonosDeLaFicha } from '../../../entities/telefonos'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'
import { BotonCambiarTelefono } from './boton-cambiar-telefono'
import { NumeroDeTelefono } from './numero-de-telefono'
import { TelefonosExtra } from './telefonos-extra'

type Props = {
  ficha: LeadDeFicha
  // Quien mira tiene el lead en su cartera y puede editarlo: sin esto no se cambia el principal.
  puedeCambiar: boolean
  // Cartera y `leads.telefonos_extra.editar`: agregar, rotular y quitar los extras.
  puedeEditarExtras: boolean
  // `leads.configurar`: el enlace «Cambiar el máximo».
  puedeConfigurar: boolean
}

// El teléfono principal y los extras, cada uno con su etiqueta. La base ya entregó cada número como
// corresponde: completo para la cartera y enmascarado para el resto; acá sólo se dice. Con la
// cartera y `leads.editar` se cambia el principal; con la cartera y `leads.telefonos_extra.editar` se administran los extras; sin
// cartera no hay ninguna acción.
export function BloqueDeTelefonos({
  ficha,
  puedeCambiar,
  puedeEditarExtras,
  puedeConfigurar,
}: Props) {
  const { enCartera, telefonoCc } = ficha
  const panel = usePanelDeLead()
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
        <TelefonosExtra
          lead={telefonosDeLaFicha(ficha)}
          puedeAdministrar={puedeEditarExtras}
          apertura={panel.extra}
          puedeConfigurar={puedeConfigurar}
        />
      </ul>
      {enCartera ? null : (
        <p className="mt-3 text-(length:--text-xs) text-(--color-ink-soft)">
          Completo solo para su cartera.
        </p>
      )}
    </Bloque>
  )
}
