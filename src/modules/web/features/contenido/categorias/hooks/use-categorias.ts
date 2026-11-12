'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type {
  CategoriaDeGuia,
  DireccionDeOrden,
  ListaDeCategorias,
} from '../../../../entities/contenido/categorias'
import { activarCategoria } from '../actions/activar-categoria'
import { eliminarCategoria } from '../actions/eliminar-categoria'
import { moverCategoria } from '../actions/mover-categoria'
import { REVISA_LA_CATEGORIA, useNombreDeCategoria } from './use-nombre-de-categoria'

// El panel «Categorías»: el nombre (alta y renombrar) y las otras tres acciones. La lista llega por props y la revalida la action
// (`revalidatePath`): aquí no se guarda una copia.
export function useCategorias(lista: ListaDeCategorias) {
  const nombre = useNombreDeCategoria()
  const activar = useAction(activarCategoria)
  const mover = useAction(moverCategoria)
  const eliminar = useAction(eliminarCategoria)
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)

  async function cambiarActiva(categoria: CategoriaDeGuia, activa: boolean): Promise<void> {
    const envio = await enviarAccion(
      activar.executeAsync({ id: categoria.id, activa }),
      REVISA_LA_CATEGORIA,
    )
    if (envio.ok) {
      avisarExito(activa ? 'Categoría activada' : 'Categoría desactivada')
    } else {
      avisarError(envio.error)
    }
  }

  async function moverUna(categoria: CategoriaDeGuia, direccion: DireccionDeOrden): Promise<void> {
    const envio = await enviarAccion(
      mover.executeAsync({ id: categoria.id, direccion }),
      REVISA_LA_CATEGORIA,
    )
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    const posicion = lista.filas.findIndex((fila) => fila.id === categoria.id) + 1
    const nueva = direccion === 'subir' ? posicion - 1 : posicion + 1
    setAnuncio(
      `Categoría «${categoria.nombre}» ${direccion === 'subir' ? 'subida' : 'bajada'} a la posición ${String(nueva)}`,
    )
    setMovimiento((anterior) => ({
      id: categoria.id,
      direccion,
      veces: (anterior?.veces ?? 0) + 1,
    }))
  }

  // Devuelve el motivo si no se pudo eliminar (el diálogo lo muestra); `null` si se eliminó.
  async function eliminarUna(id: string): Promise<string | null> {
    const envio = await enviarAccion(eliminar.executeAsync({ id }), REVISA_LA_CATEGORIA)
    if (!envio.ok) {
      return envio.error.mensaje
    }
    avisarExito('Categoría eliminada')
    return null
  }

  return {
    nombre,
    cambiarActiva,
    mover: moverUna,
    eliminar: eliminarUna,
    enCurso: nombre.enCurso || activar.isPending || mover.isPending || eliminar.isPending,
    anuncio,
    movimiento,
  }
}
