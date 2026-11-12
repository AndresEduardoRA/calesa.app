'use client'

import { Aviso } from '@/shared/ui/aviso'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { FormularioDeDatosDeLaFase } from './formulario-de-datos-de-la-fase'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// El hueco `bloques.datos` del inspector: lo que se edita de una fase. Una fase jubilada también se edita (la base lo acepta): arriba se dice que no es
// destino de ningún cambio. El formulario se reinicia con una `key` cuando llega la fase releída (la versión nueva del flujo), así lo guardado
// reemplaza lo escrito.
export function DatosDeLaFase({ flujo, fase }: Props) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {fase.activa ? null : (
        <Aviso>
          Esta fase está jubilada: no es destino de ningún cambio. Reactívala desde el ⋯ de la
          lista.
        </Aviso>
      )}
      <FormularioDeDatosDeLaFase key={`${fase.id}-${flujo.version}`} flujo={flujo} fase={fase} />
    </div>
  )
}
