'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { ValorDeCatalogo } from '../../../entities/catalogos/catalogo'
import { eliminarValor } from '../actions/eliminar-valor'
import { guardarValor } from '../actions/guardar-valor'

// Activar, desactivar y eliminar un valor desde la lista (8.08-3), una escritura a la vez. La lista se renueva con el `revalidatePath` de la action. `eliminar`
// devuelve el motivo si la base no lo dejó (uno en uso no se borra) para que el diálogo lo diga.
export function useEscrituraDeValores() {
  const { mandar } = useUnEnvioALaVez()
  return {
    activar: async (valor: ValorDeCatalogo, activo: boolean) => {
      const envio = await mandar(() =>
        enviarAccion(
          guardarValor({ id: valor.id, nombre: valor.nombre, cambios: { activo } }),
          'No se pudo guardar el valor.',
        ),
      )
      if (envio === null) return
      if (envio.ok) {
        avisarExito(activo ? 'Valor activado.' : 'Valor desactivado.')
      } else {
        avisarError(envio.error)
      }
    },
    eliminar: async (valor: ValorDeCatalogo): Promise<ErrorApp | null> => {
      const envio = await enviarAccion(
        eliminarValor({ id: valor.id, nombre: valor.nombre }),
        'No se pudo eliminar el valor.',
      )
      if (envio.ok) {
        avisarExito('Valor eliminado.')
        return null
      }
      return envio.error
    },
  }
}
