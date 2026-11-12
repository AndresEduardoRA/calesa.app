'use client'

import { PencilIcon, PlusIcon } from 'lucide-react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados/estado-vacio'
import { Monto } from '@/shared/ui/monto'
import {
  TOPE_DE_CAJAS,
  type GrupoDeMoneda,
} from '../../../entities/cotizador/filas-de-configuracion'

type Props = {
  grupos: readonly GrupoDeMoneda[]
  hayMas: boolean
  alAgregar: (moneda: string) => void
  alEditar: (moneda: string, id: string) => void
}

// El bloque «Cajas» (8.12-2, C9): un subbloque por moneda con sus cajas por monto, también las inactivas.
export function Cajas({ grupos, hayMas, alAgregar, alEditar }: Props) {
  return (
    <section aria-labelledby="cajas-del-cotizador" className="grid gap-4">
      <h2
        id="cajas-del-cotizador"
        className="text-(length:--text-lg) font-semibold text-(--color-ink)"
      >
        Cajas
      </h2>
      {grupos.map((grupo) => (
        <section key={grupo.moneda} aria-label={`Cajas en ${grupo.moneda}`} className="grid gap-2">
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
                Agregar caja en {grupo.moneda}
              </Button>
            )}
          </div>
          {grupo.cajas.length === 0 ? (
            <EstadoVacio compacto titulo={`Sin cajas en ${grupo.moneda}.`} />
          ) : (
            <ul className="grid gap-1.5">
              {grupo.cajas.map((caja, i) => (
                <li
                  key={caja.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-(--radius-md) bg-(--color-surface-2) px-3 py-2 text-(length:--text-sm)"
                >
                  <Monto valor={Number(caja.monto)} moneda={grupo.moneda} />
                  {caja.activa ? null : <Badge variant="outline">Inactiva</Badge>}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ms-auto min-h-11 md:min-h-7"
                    aria-label={`Editar la caja ${String(i + 1)} en ${grupo.moneda}`}
                    onClick={() => {
                      alEditar(grupo.moneda, caja.id)
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
        <AvisoDeTope texto={`Se muestran las primeras ${String(TOPE_DE_CAJAS)} cajas.`} />
      ) : null}
    </section>
  )
}
