'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useListaDeFases } from '../hooks/use-lista-de-fases'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { FormularioDeDatosDeLaFase } from './formulario-de-datos-de-la-fase'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// El hueco `bloques.datos` del inspector: lo que se edita de una fase. Una fase jubilada también se edita (la base lo acepta): arriba se dice que no es
// destino de ningún cambio. El formulario se reinicia con una `key` cuando llega la fase releída (la versión nueva del flujo), así lo guardado
// reemplaza lo escrito.
export function DatosDeLaFase({ flujo, fase }: Props) {
  const lista = useListaDeFases(flujo)
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {fase.activa ? null : (
        <Aviso>
          <p>Esta fase está jubilada: no es destino de ningún cambio.</p>
          {/* La salida, ahí mismo: lo mismo que «Reactivar» del ⋯ de la lista. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 min-h-11 md:min-h-8"
            disabled={lista.enCurso}
            onClick={() => void lista.reactivar(fase)}
          >
            Reactivar
          </Button>
        </Aviso>
      )}
      <FormularioDeDatosDeLaFase key={`${fase.id}-${flujo.version}`} flujo={flujo} fase={fase} />
    </div>
  )
}
