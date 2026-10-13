'use client'

import type { ReactNode } from 'react'
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
import { ValorMostrado } from './valor-mostrado'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  categorias: readonly Categoria[]
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
// layout de su origen, en su orden. Los nombres de los grupos y de los campos salen del layout.
export function FichaDeVehiculo({ vehiculo, origen, campos, categorias }: Props) {
  const { locale, zonaHoraria } = useRegional()
  const comunes = camposComunes(origen.tipo)
  return (
    <div className="grid gap-4">
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
