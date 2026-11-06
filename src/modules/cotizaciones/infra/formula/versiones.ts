import 'server-only'
import { z } from 'zod'
import {
  autoresDe,
  conAutores,
  nombreDelAutor,
  type FormulaDelOrigen,
} from '../../entities/formula/versiones'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerAutores, leerEstado, leerPaginaSinAutores } from './consulta-de-versiones'

// La pestaña «Fórmula» de un origen, en el servidor: la publicada, el borrador y la primera página de versiones (en paralelo), y los nombres de todos los que nombran
// en una sola lectura de `perfiles`.
export async function getFormulaDelOrigen(origenId: string): Promise<Resultado<FormulaDelOrigen>> {
  if (!z.guid().safeParse(origenId).success) {
    return fallo('validacion', 'Ese origen no es válido.')
  }
  const supabase = await createClient()
  const [estado, pagina] = await Promise.all([
    leerEstado(supabase, origenId),
    leerPaginaSinAutores(supabase, origenId, null),
  ])
  if (!estado.ok) {
    return estado
  }
  if (!pagina.ok) {
    return pagina
  }
  const { publicada, borrador } = estado.data
  const autores = await leerAutores(
    supabase,
    autoresDe([
      publicada?.publicadoPor ?? null,
      borrador?.creadoPor ?? null,
      ...pagina.data.filas.map((fila) => fila.publicadoPor),
    ]),
  )
  if (!autores.ok) {
    return autores
  }
  return ok({
    publicada: publicada && {
      ...publicada,
      autor: nombreDelAutor(autores.data, publicada.publicadoPor),
    },
    borrador: borrador && { ...borrador, autor: nombreDelAutor(autores.data, borrador.creadoPor) },
    versiones: conAutores(pagina.data, autores.data),
  })
}
