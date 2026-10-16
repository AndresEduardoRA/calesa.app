'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { formatearNumero } from '@/shared/lib/formato'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { useRegional } from '@/shared/ui/regional'
import {
  TEXTO_DEL_MOTIVO,
  filasDichas,
  titularDelDeshacer,
  type ResultadoDeDeshacer,
} from '../../../entities/importacion/deshacer'

type Props = { resultado: Omit<ResultadoDeDeshacer, 'repetido'> }

// Lo que hizo el deshacer: cuántos fueron a la papelera y, por motivo, qué se quedó y de qué filas del
// archivo (sin nombres ni teléfonos).
export function ResultadoDelDeshacer({ resultado }: Props) {
  const { locale } = useRegional()
  const numero = (n: number) => formatearNumero(n, { locale })
  return (
    <Aviso tono={resultado.movidos > 0 ? 'positivo' : 'info'}>
      <p className="font-medium">{titularDelDeshacer(resultado, numero)}</p>
      {resultado.quedaron.length > 0 ? (
        <ul className="mt-1 grid gap-0.5">
          {resultado.quedaron.map((q) => (
            <li key={q.motivo}>
              {TEXTO_DEL_MOTIVO[q.motivo]}: {numero(q.cantidad)} ({filasDichas(q.filas, numero)})
            </li>
          ))}
        </ul>
      ) : null}
      {resultado.purgados > 0 ? (
        <p className="mt-1">
          {numero(resultado.purgados)}{' '}
          {resultado.purgados === 1 ? 'ya se había purgado' : 'ya se habían purgado'} de la
          papelera.
        </p>
      ) : null}
      {resultado.movidos > 0 ? (
        <Link
          href={RUTAS.papeleraDeLeads as Route}
          className="mt-1 inline-block font-medium underline underline-offset-2"
        >
          Ver la papelera
        </Link>
      ) : null}
    </Aviso>
  )
}
