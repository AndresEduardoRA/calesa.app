'use client'

import { useState } from 'react'
import { BotonesDeOrden } from '@/shared/ui/lista-de-catalogo/botones-de-orden'
import {
  useFocoTrasMover,
  type Movimiento,
} from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { MasAcciones } from '@/shared/ui/lista'
import { despuesDeAlMover, motivoSinMover } from '../../../entities/fases/orden-de-fases'
import { firmaDelOrdenDeFases } from '../../../entities/fases/panel-de-fase'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { useFaseAbierta } from '../../configuracion/hooks/use-fase-abierta'
import { useAbrirEliminarFase } from '../hooks/use-eliminar-fase-por-url'
import { useListaDeFases } from '../hooks/use-lista-de-fases'
import { accionesDeFase } from './acciones-de-fase'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

const PREFIJO = 'fase'

// El hueco `accionesDeFila`: «Subir» y «Bajar» con el teclado y el «⋯» (Editar, Jubilar o eliminar, Reactivar). Son botones propios de la fila: su clic
// no abre el inspector. Un movimiento a la vez; el foco vuelve al botón cuando la página trae el orden nuevo (la fila cambia de lugar después de la respuesta).
// Las jubiladas también cuentan en el orden: la base las renumera con las demás.
export function AccionesDeFila({ flujo, fase }: Props) {
  const lista = useListaDeFases(flujo)
  const inspector = useFaseAbierta()
  const abrirQuitar = useAbrirEliminarFase()
  const [movimiento, setMovimiento] = useState<(Movimiento & { firmaAntes: string }) | null>(null)
  const firma = firmaDelOrdenDeFases(flujo.fases)
  useFocoTrasMover(PREFIJO, movimiento && firma !== movimiento.firmaAntes ? movimiento : null)

  async function mover(direccion: 'subir' | 'bajar') {
    const destino = despuesDeAlMover(flujo.fases, fase.id, direccion)
    if (destino === null) {
      return
    }
    const firmaAntes = firma
    if (await lista.mover(fase.id, destino.despuesDe)) {
      setMovimiento((antes) => ({
        id: fase.id,
        direccion,
        veces: (antes?.veces ?? 0) + 1,
        firmaAntes,
      }))
    }
  }

  return (
    <span className="flex items-center justify-end">
      <BotonesDeOrden
        prefijo={PREFIJO}
        id={fase.id}
        nombre={fase.nombre}
        puedeSubir={motivoSinMover(flujo.fases, fase.id, 'subir') === null}
        puedeBajar={motivoSinMover(flujo.fases, fase.id, 'bajar') === null}
        alMover={(direccion) => void mover(direccion)}
      />
      <MasAcciones
        nombre={fase.nombre}
        id={`fase-${fase.id}-mas`}
        acciones={accionesDeFase(fase, {
          alEditar: () => {
            inspector.abrir(fase.id)
          },
          alPedirQuitar: () => {
            abrirQuitar(fase.id)
          },
          alReactivar: () => void lista.reactivar(fase),
        })}
      />
    </span>
  )
}
