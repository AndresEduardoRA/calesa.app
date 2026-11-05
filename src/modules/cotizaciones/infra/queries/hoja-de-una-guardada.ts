import 'server-only'
import { z } from 'zod'
import { inicialDe } from '../../entities/apertura'
import { entradasDeLoGuardado } from '../../entities/entradas-de-lo-guardado'
import { entradasDelPedido, indiceDeHoja } from '../../entities/entradas'
import { hojaDeUnaGuardadaDesde } from '../../entities/hoja-de-una-guardada-lectura'
import { argumentosDeEvaluar, resultadoDeEvaluar } from '../../entities/pedido-de-recalculo'
import type { LectorDeUnaGuardada } from '../../entities/repositorios-de-hoja'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

// Lo que abre una cotización guardada: UNA llamada a `cotizacion_hoja_guardada()` (la fila y el snapshot recortados, el diseño de SU versión, quién la guarda) y, con la hoja leída,
// UNA a `cotizacion_evaluar(p_cotizacion)` con lo guardado como entradas: el primer cálculo llega con la página, como en la hoja nueva. Dos pedidos en serie (el segundo necesita
// las entradas que salen del primero); nada de lista ni de cursor. `docs/RENDIMIENTO.md` › «Cotizador (fórmula, diseño, cotizaciones)».
const esquemaId = z.guid()

export const getHojaDeUnaGuardada: LectorDeUnaGuardada = async (id) => {
  const cotizacion = esquemaId.safeParse(id)
  if (!cotizacion.success) {
    return fallo('validacion', 'Esa cotización no es válida.')
  }
  const supabase = await createClient()
  const leida = await supabase.rpc('cotizacion_hoja_guardada', { p_id: cotizacion.data })
  if (leida.error) {
    return { ok: false, error: errorDePostgrest(leida.error) }
  }
  const hoja = hojaDeUnaGuardadaDesde(leida.data)
  if (!hoja) {
    return fallo('inesperado', 'No pudimos leer la cotización. Recarga para volver a intentar.')
  }
  const indice = indiceDeHoja(hoja.diseno.secciones, hoja.diseno.cabecera.modos)
  const entradas = entradasDeLoGuardado(indice, hoja.guardado, hoja.cotizacion)
  const recalculo = resultadoDeEvaluar(
    await supabase.rpc(
      'cotizacion_evaluar',
      argumentosDeEvaluar({
        de: { tipo: 'guardada', cotizacionId: hoja.cotizacion.id },
        entradas: entradasDelPedido(entradas),
        modoTc: entradas.modoTc,
      }),
    ),
  )
  return ok({ hoja, inicial: inicialDe(hoja.diseno, recalculo) })
}
