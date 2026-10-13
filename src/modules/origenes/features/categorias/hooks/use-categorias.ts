'use client'

import { useAction } from 'next-safe-action/hooks'
import type { z } from 'zod'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarConDeshacer } from '@/shared/ui/toasts'
import type { Categoria } from '../../../entities/categoria'
import { cerrarConAviso } from '../../resultado'
import { crearCategoria } from '../actions/crear-categoria'
import { eliminarCategoria } from '../actions/eliminar-categoria'
import { guardarCategoria } from '../actions/guardar-categoria'
import { moverCategoria } from '../actions/mover-categoria'
import type { esquemaCrearCategoria } from '../schemas/categorias'

type DeLaFila = Pick<Categoria, 'id' | 'nombre' | 'actualizadoEn'>

// Las ediciones de las categorías. Lo tipeado queda siempre; cada una dice si salió.
export function useCategorias() {
  const creando = useAction(crearCategoria)
  const guardando = useAction(guardarCategoria)
  const moviendo = useAction(moverCategoria)
  const eliminando = useAction(eliminarCategoria)

  async function guardar(
    categoria: DeLaFila,
    cambios: { nombre?: string; activa?: boolean },
    version = categoria.actualizadoEn,
  ) {
    return resultadoDeAccion(
      await conRed(
        guardando.executeAsync({ id: categoria.id, actualizadoEnEsperado: version, ...cambios }),
      ),
    )
  }

  return {
    crear: async (nueva: z.input<typeof esquemaCrearCategoria>) =>
      cerrarConAviso(
        resultadoDeAccion(await conRed(creando.executeAsync(nueva))),
        `Categoría «${nueva.nombre.trim()}» creada`,
      ),
    renombrar: async (categoria: DeLaFila, nombre: string) =>
      cerrarConAviso(await guardar(categoria, { nombre }), `Categoría «${nombre.trim()}» guardada`),
    // Reversible: se hace y se ofrece «Deshacer» con la versión que devolvió el cambio.
    cambiarActiva: async (categoria: DeLaFila, activa: boolean) => {
      const resultado = cerrarConAviso(await guardar(categoria, { activa }), null)
      if (resultado.ok) {
        const deshacer = resultado.data.actualizadoEn
        avisarConDeshacer(
          activa ? `«${categoria.nombre}» reactivada` : `«${categoria.nombre}» desactivada`,
          () => {
            void guardar(categoria, { activa: !activa }, deshacer).then((vuelta) =>
              cerrarConAviso(vuelta, null),
            )
          },
        )
      }
      return resultado
    },
    mover: async (categoria: DeLaFila, despuesDe: string | null) =>
      cerrarConAviso(
        resultadoDeAccion(
          await conRed(
            moviendo.executeAsync({
              id: categoria.id,
              despuesDe,
              actualizadoEnEsperado: categoria.actualizadoEn,
            }),
          ),
        ),
        null,
      ),
    eliminar: async (categoria: DeLaFila) =>
      cerrarConAviso(
        resultadoDeAccion(
          await conRed(
            eliminando.executeAsync({
              id: categoria.id,
              actualizadoEnEsperado: categoria.actualizadoEn,
            }),
          ),
        ),
        `Categoría «${categoria.nombre}» eliminada`,
      ),
    enCurso: creando.isPending || guardando.isPending || moviendo.isPending || eliminando.isPending,
    errores: { crear: creando.result.validationErrors?.fieldErrors },
  }
}

export type EdicionesDeCategorias = ReturnType<typeof useCategorias>
