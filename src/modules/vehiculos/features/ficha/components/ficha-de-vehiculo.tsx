'use client'

import type { CampoDeLayout, Categoria, OrigenResumen } from '@/modules/origenes/client'
import { Bloque } from '@/shared/ui/bloque'
import { Dato, DatosPorGrupo, RejillaDeDatos, ValorMostrado } from '@/shared/ui/campos'
import { useRegional } from '@/shared/ui/regional'
import { BLOQUES_COMUNES, camposComunes, valorComun } from '../../../entities/comunes'
import type { Vehiculo } from '../../../entities/vehiculo'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  categorias: readonly Categoria[]
}

// La ficha de un vehículo: lo común en dos bloques y, después, un bloque por cada grupo del
// layout de su origen, en su orden. Los nombres de los grupos y de los campos salen del layout.
export function FichaDeVehiculo({ vehiculo, origen, campos, categorias }: Props) {
  const { locale } = useRegional()
  const comunes = camposComunes(origen.tipo)
  return (
    <div className="grid gap-4">
      {BLOQUES_COMUNES.map((bloque) => (
        <Bloque key={bloque.clave} titulo={bloque.titulo}>
          <RejillaDeDatos>
            {comunes
              .filter((campo) => campo.bloque === bloque.clave && campo.clave !== 'titulo')
              .map((campo) => (
                <Dato key={campo.clave} etiqueta={campo.etiqueta}>
                  <ValorMostrado valor={valorComun(campo, vehiculo, { categorias, locale })} />
                </Dato>
              ))}
          </RejillaDeDatos>
        </Bloque>
      ))}
      <DatosPorGrupo campos={campos} atributos={vehiculo.atributos} />
    </div>
  )
}
