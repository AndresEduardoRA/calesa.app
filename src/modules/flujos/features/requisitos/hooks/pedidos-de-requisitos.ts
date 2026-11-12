import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { AmbitoDeFlujo } from '../../../entities/flujo'
import type { CambiosDeRequisito } from '../../../entities/requisitos/formulario-de-edicion'
import type { ContenidoDeRequisito } from '../../../entities/requisitos/repositorios'
import type { VersionNueva } from '../../../entities/requisitos/respuestas'
import { crearRequisito } from '../actions/crear-requisito'
import { eliminarRequisito } from '../actions/eliminar-requisito'
import { guardarRequisito } from '../actions/guardar-requisito'
import { moverRequisito } from '../actions/mover-requisito'

const MENSAJE_DE_VALIDACION = 'Revisa los datos del requisito.'

// Las cuatro Server Actions de los requisitos, como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al servidor). Cada una manda el
// ámbito del flujo (la action exige su permiso) y la versión del flujo que se tenía en pantalla.
export function pedidosDeRequisitos(ambito: AmbitoDeFlujo, version: string) {
  return {
    mover: (id: string, despuesDe: string | null) =>
      enviarAccion<VersionNueva>(
        moverRequisito({ id, ambito, actualizadoEnEsperado: version, despuesDe }),
        MENSAJE_DE_VALIDACION,
      ),
    quitar: (id: string) =>
      enviarAccion<VersionNueva>(
        eliminarRequisito({ id, ambito, actualizadoEnEsperado: version }),
        MENSAJE_DE_VALIDACION,
      ),
    crear: (id: string, faseId: string, contenido: ContenidoDeRequisito) =>
      enviarAccion<VersionNueva>(
        crearRequisito({ id, ambito, faseId, actualizadoEnEsperado: version, ...contenido }),
        MENSAJE_DE_VALIDACION,
      ),
    guardar: (id: string, cambios: CambiosDeRequisito) =>
      enviarAccion<VersionNueva>(
        guardarRequisito({ id, ambito, actualizadoEnEsperado: version, cambios }),
        MENSAJE_DE_VALIDACION,
      ),
  }
}
