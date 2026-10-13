'use client'

import type { ReactNode } from 'react'
import type { FaseResumen } from '@/modules/flujos/client'
import {
  agruparCampos,
  type CampoDeLayout,
  type Categoria,
  type OrigenResumen,
} from '@/modules/origenes/client'
import { Bloque } from '@/shared/ui/bloque'
import { useRegional } from '@/shared/ui/regional'
import { BLOQUES_COMUNES, camposComunes, valorComun } from '../../../entities/comunes'
import { valorMostrado } from '../../../entities/valor'
import type { Vehiculo } from '../../../entities/vehiculo'
import { BadgeDeFase } from '../../listado/components/badge-de-fase'
import { Miniatura } from '../../listado/components/miniatura'
import { ValorMostrado } from './valor-mostrado'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  categorias: readonly Categoria[]
  // La fase actual, entre las del flujo del origen; null = sin fase.
  fase: FaseResumen | null
  // «Editar», si la persona puede.
  acciones?: ReactNode
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink)">{children}</dd>
    </div>
  )
}

const REJILLA = 'grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3'

// La ficha de un vehículo: lo común en dos bloques y, después, un bloque por cada grupo del
// layout de su origen, en su orden. La fase se muestra y no se cambia acá (se mueve desde
// logística). Los nombres de los grupos y de los campos salen del layout.
export function FichaDeVehiculo({ vehiculo, origen, campos, categorias, fase, acciones }: Props) {
  const { locale, zonaHoraria } = useRegional()
  const comunes = camposComunes(origen.tipo)
  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-start gap-4">
        <Miniatura ruta={vehiculo.portadaRuta} className="w-24" />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
            {vehiculo.titulo}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-(length:--text-sm) text-(--color-ink-soft)">
            <span className="tabular-nums">#{vehiculo.numero}</span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: origen.color }}
              />
              {origen.nombre}
            </span>
            <BadgeDeFase fase={fase} />
          </div>
        </div>
        {acciones ? <div className="flex gap-2">{acciones}</div> : null}
      </header>
      {BLOQUES_COMUNES.map((bloque) => (
        <Bloque key={bloque.clave} titulo={bloque.titulo}>
          <dl className={REJILLA}>
            {comunes
              .filter((campo) => campo.bloque === bloque.clave && campo.clave !== 'titulo')
              .map((campo) => (
                <Dato key={campo.clave} etiqueta={campo.etiqueta}>
                  <ValorMostrado valor={valorComun(campo, vehiculo, { categorias, locale })} />
                </Dato>
              ))}
          </dl>
        </Bloque>
      ))}
      {agruparCampos(campos).map((grupo) => (
        <Bloque key={grupo.nombre ?? ''} titulo={grupo.nombre ?? 'Otros datos'}>
          <dl className={REJILLA}>
            {grupo.campos.map((campo) => (
              <Dato key={campo.clave} etiqueta={campo.etiqueta}>
                <ValorMostrado
                  valor={valorMostrado(campo, vehiculo.atributos[campo.clave], {
                    locale,
                    zona: zonaHoraria,
                  })}
                />
              </Dato>
            ))}
          </dl>
        </Bloque>
      ))}
    </div>
  )
}
