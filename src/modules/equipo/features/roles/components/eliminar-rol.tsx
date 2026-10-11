'use client'

import { useAction } from 'next-safe-action/hooks'
import { errorDeAccion } from '@/shared/lib/formularios'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { RolConConcesiones } from '../../../entities/rol'
import { eliminarRol } from '../actions/eliminar-rol'

type Props = {
  // El rol que se pidió eliminar; null = el diálogo está cerrado.
  rol: RolConConcesiones | null
  alCerrar: () => void
}

// Eliminar un rol no se deshace: se confirma nombrándolo.
export function EliminarRol({ rol, alCerrar }: Props) {
  const { executeAsync, isPending } = useAction(eliminarRol)

  async function eliminar(elegido: RolConConcesiones) {
    const resultado = await executeAsync({
      rolId: elegido.id,
      actualizadoEnEsperado: elegido.actualizadoEn,
    })
    if (resultado.data?.ok) {
      avisarExito(`Rol «${elegido.nombre}» eliminado`)
    } else {
      const error = errorDeAccion(resultado)
      if (error) {
        avisarError(error)
      }
    }
    alCerrar()
  }

  return (
    <Confirmar
      abierto={rol !== null}
      alCerrar={alCerrar}
      alConfirmar={() => {
        if (rol) {
          void eliminar(rol)
        }
      }}
      titulo={rol ? `Eliminar el rol ${rol.nombre}` : 'Eliminar el rol'}
      descripcion="El rol y los permisos que tiene dados desaparecen. No se puede deshacer."
      etiquetaConfirmar="Eliminar rol"
      enCurso={isPending}
    />
  )
}
