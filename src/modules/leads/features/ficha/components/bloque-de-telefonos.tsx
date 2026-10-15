'use client'

import { Bloque } from '@/shared/ui/bloque'
import { telefonoDeFicha, type LeadDeFicha } from '../../../entities/ficha'
import { BotonCambiarTelefono } from './boton-cambiar-telefono'

type Props = {
  ficha: LeadDeFicha
  // Quien mira tiene el lead en su cartera y puede editarlo: sin esto no hay acciones.
  puedeCambiar: boolean
}

// El teléfono principal y los extras, cada uno con su etiqueta. La base ya entregó cada número como
// corresponde: completo para la cartera y enmascarado para el resto; acá sólo se dice. Para la
// cartera es un enlace de llamada; enmascarado no lo es.
function Numero({
  numero,
  codigoDePais,
  llamable,
}: {
  numero: string
  codigoDePais: string | null
  llamable: boolean
}) {
  const texto = telefonoDeFicha(numero, codigoDePais)
  if (!llamable || numero === '') {
    return <span className="tabular-nums">{texto}</span>
  }
  return (
    <a
      href={`tel:+${numero}`}
      className="text-(--color-primario-ink) tabular-nums underline-offset-2 hover:underline"
    >
      {texto}
    </a>
  )
}

export function BloqueDeTelefonos({ ficha, puedeCambiar }: Props) {
  const { enCartera, telefonoCc } = ficha
  return (
    <Bloque titulo="Teléfonos">
      <ul className="grid gap-2 text-(length:--text-sm) text-(--color-ink)">
        <li className="flex flex-wrap items-baseline gap-x-2">
          <Numero numero={ficha.telefono} codigoDePais={telefonoCc} llamable={enCartera} />
          <span className="text-(length:--text-xs) text-(--color-ink-soft)">Principal</span>
          {puedeCambiar ? <BotonCambiarTelefono /> : null}
        </li>
        {ficha.telefonos.map((extra) => (
          <li key={extra.id} className="flex flex-wrap items-baseline gap-x-2">
            <Numero numero={extra.telefono} codigoDePais={telefonoCc} llamable={enCartera} />
            {extra.etiqueta ? (
              <span className="text-(length:--text-xs) text-(--color-ink-soft)">
                {extra.etiqueta}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {enCartera ? null : (
        <p className="mt-3 text-(length:--text-xs) text-(--color-ink-soft)">
          Completo solo para su cartera.
        </p>
      )}
    </Bloque>
  )
}
