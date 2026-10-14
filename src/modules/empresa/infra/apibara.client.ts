import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { invocarFuncion } from '@/shared/lib/supabase/funciones.client'
import {
  MENSAJES_DE_USO,
  codigoDeUso,
  usoDesdeRespuesta,
  type UsoDeApibara,
} from '../entities/uso-apibara'

const respuestaDeUso = z.object({ ok: z.literal(true), data: z.unknown() })
const respuestaDeFallo = z.object({ ok: z.literal(false), error: z.object({ codigo: z.string() }) })

// El uso de la cuenta, a pedido. La clave la lee la edge function; esto sólo le pide el resumen.
export async function consultarUso(): Promise<Resultado<UsoDeApibara>> {
  const respuesta = await invocarFuncion('apibara', { accion: 'uso' })
  switch (respuesta.tipo) {
    case 'sin_sesion':
      return fallo('no_autenticado', 'Tu sesión venció. Vuelve a ingresar.')
    case 'caida':
      return fallo('inesperado', MENSAJES_DE_USO.red)
    case 'tiempo':
      return fallo('inesperado', MENSAJES_DE_USO.tiempo)
    case 'bytes':
      return fallo('inesperado', MENSAJES_DE_USO.proveedor)
    case 'json': {
      const bien = respuestaDeUso.safeParse(respuesta.cuerpo)
      const uso = bien.success ? usoDesdeRespuesta(bien.data.data) : null
      if (uso) {
        return ok(uso)
      }
      const mal = respuestaDeFallo.safeParse(respuesta.cuerpo)
      const codigo = codigoDeUso(mal.success ? mal.data.error.codigo : null)
      return fallo(codigo === 'sin_permiso' ? 'sin_permiso' : 'inesperado', MENSAJES_DE_USO[codigo])
    }
  }
}
