'use client'

import { useState } from 'react'
import { avisarConDeshacer, avisarExito } from '@/shared/ui/toasts'
import {
  anuncioDeRestauracion,
  anuncioDeRetiro,
  firmaDeNiveles,
  type ListaDeNiveles,
  type NivelDeAcceso,
} from '../../../entities/nivel'
import { useEscrituraDeNiveles } from './use-escritura-de-niveles'
import { usePedidosDeNiveles } from './use-pedidos-de-niveles'

// La lista de la página, sembrada por una firma: si lo que trae cambia (otra persona, «Recargar»), la local se vuelve a sembrar con eso.
function useListaSembrada(inicial: ListaDeNiveles) {
  const firma = firmaDeNiveles(inicial)
  const [visto, setVisto] = useState(firma)
  const [lista, setLista] = useState<ListaDeNiveles>(inicial)
  if (visto !== firma) {
    setVisto(firma)
    setLista(inicial)
  }
  return [lista, setLista] as const
}

// Qué fila cambió de grupo (la pantalla le devuelve el foco a su «⋯») y cuántas veces: dos retiros seguidos del mismo nivel mueven el foco dos veces.
export type CambioDeGrupo = { id: string; veces: number }

// Los niveles de la pantalla de configuración. Cada acción devuelve la lista entera con las versiones nuevas y el motivo de uso de cada uno
// (a lo sumo el tope) y esa reemplaza a la local: ningún pedido extra. Una escritura a la vez. Un conflicto o una regla que ya no se cumple se
// dicen y la página se vuelve a leer.
export function useNiveles(inicial: ListaDeNiveles) {
  const [lista, poner] = useListaSembrada(inicial)
  const escritura = useEscrituraDeNiveles(poner)
  const pedir = usePedidosDeNiveles()
  // Lo que anuncia el lector de pantalla tras retirar o restaurar, y qué fila cambió de grupo.
  const [anuncio, setAnuncio] = useState('')
  const [cambio, setCambio] = useState<CambioDeGrupo | null>(null)

  function cambioDeGrupo(id: string, texto: string) {
    setAnuncio(texto)
    setCambio((antes) => ({ id, veces: (antes?.veces ?? 0) + 1 }))
  }

  // Retirar y restaurar guardan solos y son reversibles: se ofrece «Deshacer» con la versión nueva (no hay confirmación que valga lo que cuesta
  // equivocarse en un clic).
  async function retirar(nivel: NivelDeAcceso) {
    const envio = await escritura.mandar(() => pedir.retirar(nivel))
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    cambioDeGrupo(nivel.id, anuncioDeRetiro(nivel.nombre))
    const quedo = envio.data.lista.niveles.find((uno) => uno.id === nivel.id)
    if (quedo) {
      avisarConDeshacer(`«${nivel.nombre}» retirado.`, () => {
        void restaurar(quedo)
      })
    }
  }

  async function restaurar(nivel: NivelDeAcceso) {
    const envio = await escritura.mandar(() => pedir.restaurar(nivel))
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    cambioDeGrupo(nivel.id, anuncioDeRestauracion(nivel.nombre))
    const quedo = envio.data.lista.niveles.find((uno) => uno.id === nivel.id)
    // Restaurar uno que otra persona ya había restaurado no cambió nada: no hay qué deshacer.
    if (quedo && !envio.data.repetido) {
      avisarConDeshacer(`«${nivel.nombre}» restaurado.`, () => {
        void retirar(quedo)
      })
    }
  }

  async function eliminar(nivel: NivelDeAcceso): Promise<boolean> {
    const envio = await escritura.mandar(() => pedir.eliminar(nivel))
    if (!envio?.ok) {
      if (envio) {
        // «Está en 2 celdas de 1 origen…» (alguien lo puso en uso mientras se confirmaba): el motivo de la base sale tal cual y la lista se relee
        // para que la fila lo muestre.
        escritura.rechazar(envio)
        escritura.releer()
      }
      return false
    }
    avisarExito(`«${nivel.nombre}» eliminado.`)
    return true
  }

  return {
    lista,
    niveles: lista.niveles,
    anuncio,
    cambio,
    enCurso: escritura.enCurso,
    // Los dos del modal devuelven el envío entero: el modal dice el motivo junto al campo.
    crear: (id: string, nombre: string) => escritura.mandar(() => pedir.crear(id, nombre)),
    renombrar: (nivel: NivelDeAcceso, nombre: string) =>
      escritura.mandar(() => pedir.renombrar(nivel, nombre)),
    retirar,
    restaurar,
    eliminar,
  }
}

export type Niveles = ReturnType<typeof useNiveles>
