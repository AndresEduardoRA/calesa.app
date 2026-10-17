'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { useRegional } from './regional'
import {
  SIN_NUMEROS,
  escribirNumeros,
  type NumeroEscrito,
  type NumerosDeLead,
} from '@/shared/lib/numeros-de-lead'

// Los números de un lead escritos con el separador de miles de la empresa. Para un texto (la descripción de un
// panel, un aviso); para dibujarlos, `<NumeroDeLead>`.
export function useNumeroEscrito(numeros: NumerosDeLead): NumeroEscrito {
  const { locale } = useRegional()
  return escribirNumeros(numeros, (valor) => formatearNumero(valor, { locale, decimales: 0 }))
}

// Los números de un lead en una sola línea de texto («N.º 1.234 · Tu n.º 12»); vacía si no se ve ninguno o no hay lead.
export function useNumerosEnTexto(lead: { numeros: NumerosDeLead } | null): string {
  const escrito = useNumeroEscrito(lead?.numeros ?? SIN_NUMEROS)
  return [escrito.principal, escrito.secundario].filter(Boolean).join(' · ')
}

// «N.º 1.234» (el global, con el permiso) o «Tu n.º 12»; con `conSecundario`, también el otro («Tu n.º 12»,
// «N.º 12 · Berta»). Cada uno es un `<span>` suelto: en una fila que se parte (el celular) se acomodan solos y
// no ensanchan nada. No dibuja nada si no se ve ninguno. El secundario sólo se pide donde llega con el nombre de quien
// lo creó (la ficha): sin él, un propio ajeno se leería como «Tu n.º».
export function NumeroDeLead({
  numeros,
  conSecundario = false,
  className,
}: {
  numeros: NumerosDeLead
  conSecundario?: boolean
  className?: string
}) {
  const escrito = useNumeroEscrito(numeros)
  if (escrito.principal === null) {
    return null
  }
  // «N.º» y la cifra no se separan: en una tarjeta angosta una línea no parte «N.º | 7.654.321».
  const clases = `whitespace-nowrap ${className ?? 'tabular-nums'}`.trim()
  return (
    <>
      <span className={clases} data-numero="principal">
        {escrito.principal}
      </span>
      {conSecundario && escrito.secundario !== null ? (
        <span className={clases} data-numero="secundario">
          {escrito.secundario}
        </span>
      ) : null}
    </>
  )
}
