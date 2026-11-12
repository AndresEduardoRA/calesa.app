'use client'

import { avisarExito } from '@/shared/ui/toasts'
import type { CambiosDeFase } from '../../../entities/fases/formulario-de-fase'
import { avisoDeLoHecho } from '../../../entities/fases/vista-de-impacto'
import type { FaseParaConfigurar } from '../../../entities/flujo'
import { useEscrituraDeFases } from './use-escritura-de-fases'
import { usePedidosDeFases, type FlujoDePedido } from './use-pedidos-de-fases'

// Las escrituras de la lista de fases: las del modal (crear), subir y bajar, jubilar o eliminar y reactivar. Una escritura a la vez. La lista no viene
// en la respuesta: cada action revalida la página y ésta trae las fases releídas. Un conflicto, o un rechazo de la regla o del permiso, se dicen y la
// página se vuelve a leer.
export function useListaDeFases(flujo: FlujoDePedido) {
  const escritura = useEscrituraDeFases()
  const pedir = usePedidosDeFases(flujo)

  // Devuelve si se movió (el foco vuelve al botón cuando la página trae el orden nuevo).
  async function mover(id: string, despuesDe: string | null): Promise<boolean> {
    const envio = await escritura.mandar(() => pedir.mover(id, despuesDe))
    if (envio === null) {
      return false
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
    }
    return envio.ok
  }

  // Sin unidades ni historial se borra; si entre la lectura y el clic llegó uso, la base la jubila y el aviso lo dice.
  async function quitar(fase: Pick<FaseParaConfigurar, 'id' | 'nombre'>): Promise<boolean> {
    const envio = await escritura.mandar(() => pedir.eliminar(fase.id))
    if (envio === null) {
      return false
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return false
    }
    avisarExito(avisoDeLoHecho(envio.data.accion, fase.nombre))
    return true
  }

  async function reactivar(fase: Pick<FaseParaConfigurar, 'id' | 'nombre'>): Promise<void> {
    const envio = await escritura.mandar(() => pedir.reactivar(fase.id))
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    avisarExito(`Fase «${fase.nombre}» reactivada.`)
  }

  return {
    enCurso: escritura.enCurso,
    // Lo que el modal necesita: el envío entero, para decir el motivo junto al campo.
    crear: (id: string, datos: CambiosDeFase) => escritura.mandar(() => pedir.crear(id, datos)),
    mover,
    quitar,
    reactivar,
    leerImpacto: pedir.leerImpacto,
  }
}

export type ListaDeFasesEnPantalla = ReturnType<typeof useListaDeFases>
