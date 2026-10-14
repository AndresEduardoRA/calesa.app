import { z } from 'zod'
import { invocarFuncion } from '@/shared/lib/supabase/funciones.client'
import {
  esCodigoDeApibara,
  falloDeApibara,
  tipoDeImagen,
  type FichaDeApibara,
  type ResultadoDeApibara,
} from '../entities/apibara'

// La única vía a apibara desde el navegador: la edge function `apibara`, con la sesión de quien
// está. La clave nunca pasa por acá (la lee la función) y los errores esperados llegan como
// códigos, no como excepciones.

const respuestaDeFicha = z.object({
  ok: z.literal(true),
  data: z.object({ data: z.record(z.string(), z.unknown()), url: z.string().nullable() }),
})
const respuestaDeFallo = z.object({
  ok: z.literal(false),
  error: z.object({ codigo: z.string() }),
})

function falloDeLaFuncion(cuerpo: unknown): ResultadoDeApibara<never> {
  const fallo = respuestaDeFallo.safeParse(cuerpo)
  const codigo = fallo.success ? fallo.data.error.codigo : null
  return falloDeApibara(esCodigoDeApibara(codigo) ? codigo : 'proveedor')
}

// Trae la ficha de un enlace, un VIN o un lote en un origen de subasta.
export async function consultarFicha(
  origenId: string,
  entrada: string,
): Promise<ResultadoDeApibara<FichaDeApibara>> {
  const respuesta = await invocarFuncion('apibara', { accion: 'ficha', origen: origenId, entrada })
  switch (respuesta.tipo) {
    case 'sin_sesion':
      return falloDeApibara('sin_permiso')
    case 'caida':
      return falloDeApibara('red')
    case 'tiempo':
      return falloDeApibara('tiempo')
    case 'bytes':
      return falloDeApibara('proveedor')
    case 'json': {
      const ficha = respuestaDeFicha.safeParse(respuesta.cuerpo)
      return ficha.success
        ? { ok: true, data: ficha.data.data }
        : falloDeLaFuncion(respuesta.cuerpo)
    }
  }
}

// Baja una foto de la respuesta (sólo de las dos plataformas). El archivo vuelve con su tipo,
// listo para pasar por `prepararFoto()`.
export async function descargarFoto(
  origenId: string,
  url: string,
  nombre: string,
): Promise<ResultadoDeApibara<File>> {
  const respuesta = await invocarFuncion('apibara', { accion: 'foto', origen: origenId, url })
  if (respuesta.tipo === 'json') {
    return falloDeLaFuncion(respuesta.cuerpo)
  }
  if (respuesta.tipo !== 'bytes') {
    return falloDeApibara(respuesta.tipo === 'tiempo' ? 'tiempo' : 'red')
  }
  const bytes = new Uint8Array(await respuesta.bytes.arrayBuffer())
  const tipo = tipoDeImagen(bytes)
  if (tipo === null) {
    return falloDeApibara('proveedor')
  }
  return { ok: true, data: new File([bytes], nombre, { type: tipo }) }
}
