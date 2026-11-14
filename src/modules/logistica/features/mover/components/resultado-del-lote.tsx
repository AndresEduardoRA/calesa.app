'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { unidadDeLogistica } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { textoDelReintento } from '../lote/vista-del-lote'
import type { ResumenDelLote } from '../lote/resultado-del-lote'

type Props = {
  resumen: ResumenDelLote
  alReintentar: () => void
  alCerrar: () => void
}

// El resultado entero de un lote (6.04-3): cuántas se movieron y, por cada una que no, su nombre y su motivo. «Reintentar» vuelve a la vista previa con sólo las que fallaron.
export function ResultadoDelLote({ resumen, alReintentar, alCerrar }: Props) {
  const { titular, fallidas } = resumen
  return (
    <section aria-label="Resultado del lote" data-resultado-del-lote className="grid gap-3">
      <Aviso tono={fallidas.length === 0 ? 'positivo' : 'aviso'}>
        <p className="font-medium">{titular}</p>
      </Aviso>
      {fallidas.length > 0 ? (
        <ul role="list" className="grid gap-1.5 text-(length:--text-sm) text-(--color-ink)">
          {fallidas.map((f) => (
            <li key={f.vehiculoId} className="break-words">
              {f.linea}{' '}
              {/* La salida de cada una: su unidad, donde «Qué falta» dice qué cargar y lleva ahí. */}
              <Link
                href={unidadDeLogistica(f.vehiculoId) as Route}
                className="inline-flex min-h-11 items-center font-medium underline underline-offset-2 md:min-h-0"
              >
                Abrir la unidad
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {fallidas.length > 0 ? (
          <Button type="button" className="min-h-11 md:min-h-9" onClick={alReintentar}>
            {textoDelReintento(fallidas.length)}
          </Button>
        ) : null}
        <Button
          type="button"
          variant={fallidas.length > 0 ? 'ghost' : 'default'}
          className="min-h-11 md:min-h-9"
          onClick={alCerrar}
        >
          Cerrar
        </Button>
      </div>
    </section>
  )
}
