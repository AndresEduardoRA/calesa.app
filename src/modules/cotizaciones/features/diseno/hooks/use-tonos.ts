'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { firmaDeTonos } from '../../../entities/diseno/panel-de-tonos'
import type { RespuestaDeTonos } from '../../../entities/diseno/respuesta-de-tonos'
import type {
  CambiosDeUnTono,
  ColoresDeUnTono,
  ListaDeTonos,
  Tono,
} from '../../../entities/diseno/tonos'
import { usePedidosDeTonos } from './use-pedidos-de-tonos'

export type EnvioDeTonos = Envio<RespuestaDeTonos>

// Un conflicto, un permiso que se perdió o una regla que ya no se cumple (un tono que una fórmula pasó a usar mientras se confirmaba eliminarlo): la página se relee.
const REFRESCAN = new Set(['conflicto', 'sin_permiso', 'regla'])

// La lista de la página, sembrada por una firma: si lo que trae cambia (otra persona, «Recargar»), la local se vuelve a sembrar con eso.
function useListaSembrada(inicial: ListaDeTonos) {
  const firma = firmaDeTonos(inicial)
  const [visto, setVisto] = useState(firma)
  const [lista, setLista] = useState(inicial)
  if (visto !== firma) {
    setVisto(firma)
    setLista(inicial)
  }
  return [lista, setLista] as const
}

// Los tonos de la pantalla. Cada escritura devuelve la lista entera con las versiones nuevas y esa reemplaza a la local: ningún pedido extra. Un envío a la vez
// (con una marca propia, no `isPending`: un Enter repetido llega antes de que el estado cambie). Crear y guardar devuelven el envío entero: el modal dice el
// motivo junto a su campo.
export function useTonos(inicial: ListaDeTonos) {
  const router = useRouter()
  const [lista, poner] = useListaSembrada(inicial)
  const pedir = usePedidosDeTonos()
  const unaVez = useUnEnvioALaVez()

  const mandar = (pedido: () => Promise<EnvioDeTonos>) =>
    unaVez.mandar(async () => {
      const envio = await pedido()
      if (envio.ok) poner(envio.data.lista)
      return envio
    })

  // Eliminar no tiene campo: «“Dorado” lo usa la fórmula de “Subasta”…» sale tal cual lo dice la base y la página se relee para que la fila lo refleje.
  async function eliminar(tono: Tono): Promise<boolean> {
    const envio = await mandar(() => pedir.eliminar(tono))
    if (envio === null) return false
    if (envio.ok) {
      avisarExito(`«${tono.nombre}» eliminado.`)
      return true
    }
    avisarError(envio.error)
    if (REFRESCAN.has(envio.error.codigo)) router.refresh()
    return false
  }

  return {
    lista,
    enCurso: unaVez.enCurso,
    crear: (id: string, nombre: string, colores: ColoresDeUnTono) =>
      mandar(() => pedir.crear(id, nombre, colores)),
    guardar: (tono: Tono, cambios: CambiosDeUnTono) => mandar(() => pedir.guardar(tono, cambios)),
    eliminar,
  }
}

export type Tonos = ReturnType<typeof useTonos>
