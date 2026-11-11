import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { AmbitoDeFlujo } from '../../../entities/flujo'
import type { DatosDeDato } from '../../../entities/requisitos/formulario-de-dato'
import type { VersionNueva } from '../../../entities/requisitos/respuestas'
import { crearRequisitoDeDato } from '../actions/crear-requisito-de-dato'
import { eliminarRequisito } from '../actions/eliminar-requisito'
import { moverRequisito } from '../actions/mover-requisito'

const MENSAJE_DE_VALIDACION = 'Revisa los datos del requisito.'

// Las tres Server Actions de los requisitos, como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al servidor). Cada una manda el
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
    crearDato: (id: string, faseId: string, datos: DatosDeDato) =>
      enviarAccion<VersionNueva>(
        crearRequisitoDeDato({ id, ambito, faseId, actualizadoEnEsperado: version, datos }),
        MENSAJE_DE_VALIDACION,
      ),
  }
}
