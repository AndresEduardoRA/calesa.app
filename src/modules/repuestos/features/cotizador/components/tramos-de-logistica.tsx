'use client'

import { PencilIcon, PlusIcon } from 'lucide-react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados/estado-vacio'
import { Monto } from '@/shared/ui/monto'
import {
  TOPE_DE_TRAMOS,
  type GrupoDeMoneda,
} from '../../../entities/cotizador/filas-de-configuracion'

type Props = {
  grupos: readonly GrupoDeMoneda[]
  hayMas: boolean
  alAgregar: (moneda: string) => void
  alEditar: (moneda: string, id: string) => void
}

// El bloque «Tramos de logística» (8.12-2, C9): un subbloque por moneda con sus tramos por «Desde», también los inactivos. `Number` sólo para dibujar
// (D20). Una moneda inactiva que todavía tiene tramos se muestra, sin «Agregar».
export function TramosDeLogistica({ grupos, hayMas, alAgregar, alEditar }: Props) {
  return (
    <section aria-labelledby="tramos-de-logistica" className="grid gap-4">
      <h2
        id="tramos-de-logistica"
        className="text-(length:--text-lg) font-semibold text-(--color-ink)"
      >
        Tramos de logística
      </h2>
      {grupos.map((grupo) => (
        <section key={grupo.moneda} aria-label={`Tramos en ${grupo.moneda}`} className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-(length:--text-sm) font-medium text-(--color-ink)">
              {grupo.moneda}
              {grupo.inactiva ? ' (inactiva)' : ''}
            </h3>
            {grupo.inactiva ? null : (
              <Button
                variant="outline"
                className="h-11 md:h-8"
                onClick={() => {
                  alAgregar(grupo.moneda)
                }}
              >
                <PlusIcon aria-hidden />
                Agregar tramo en {grupo.moneda}
              </Button>
            )}
          </div>
          {grupo.tramos.length === 0 ? (
            <EstadoVacio
              compacto
              titulo={`Sin tramos en ${grupo.moneda}: ninguna línea tendrá logística sugerida.`}
            />
          ) : (
            <ul className="grid gap-1.5">
              {grupo.tramos.map((tramo, i) => (
                <li
                  key={tramo.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-(--radius-md) bg-(--color-surface-2) px-3 py-2 text-(length:--text-sm)"
                >
                  <span className="text-(--color-ink)">
                    De <Monto valor={Number(tramo.costoMin)} moneda={grupo.moneda} />{' '}
                    {tramo.costoMax === null ? (
                      'en adelante'
                    ) : (
                      <>
                        a <Monto valor={Number(tramo.costoMax)} moneda={grupo.moneda} />
                      </>
                    )}
                  </span>
                  <span className="text-(--color-ink-muted)">
                    Logística <Monto valor={Number(tramo.monto)} moneda={grupo.moneda} />
                  </span>
                  {tramo.activo ? null : <Badge variant="outline">Inactivo</Badge>}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ms-auto min-h-11 md:min-h-7"
                    aria-label={`Editar el tramo ${String(i + 1)} en ${grupo.moneda}`}
                    onClick={() => {
                      alEditar(grupo.moneda, tramo.id)
                    }}
                  >
                    <PencilIcon aria-hidden />
                    Editar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {hayMas ? (
        <AvisoDeTope texto={`Se muestran los primeros ${String(TOPE_DE_TRAMOS)} tramos.`} />
      ) : null}
    </section>
  )
}
