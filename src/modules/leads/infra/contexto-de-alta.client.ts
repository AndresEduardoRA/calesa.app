// Lo que «Nuevo lead» necesita y el documento de cada pantalla ya no manda: el contexto del alta (orígenes y tipos de lead activos, tipos de
// seguimiento, el último origen de quien lo abre, el código de país y la ciudad y el país de la empresa: `lead_alta_contexto()`) y el layout
// de campos (`leads_campos`). Dos pedidos en paralelo, desde el navegador, la primera vez que se pide el drawer (o antes, cuando el puntero
// llega al botón); antes los leía el layout `(app)` en el servidor en cada pantalla y viajaban en su documento (~26 KB con 100 orígenes y
// 100 tipos, `docs/RENDIMIENTO.md` › «Cierre 5b-fix»). Su tope es el de escribir: 100 orígenes y 100 tipos (los tipos de seguimiento todavía
// no tienen pantalla ni tope, `docs/PLAN.md` 5b-5). Lo leído vale un minuto y se tira cuando se crea o cambia un origen o un tipo.
import { errorDePostgrest, type Resultado, ok } from '@/shared/lib/errores'
import { memoriaDeLectura } from '@/shared/lib/memoria-de-lectura'
import { createClient } from '@/shared/lib/supabase/browser'
import { contextoDeAltaDesde, type ContextoDeAlta } from '../entities/alta'
import { camposDeLeadDesde, type CampoDeLead } from '../entities/campo'

export type DatosDelAlta = { contexto: ContextoDeAlta; campos: CampoDeLead[] }

export const VIDA_DEL_CONTEXTO_DE_ALTA_MS = 60_000

async function leer(): Promise<Resultado<DatosDelAlta>> {
  const supabase = createClient()
  // Los dos pedidos salen a la vez. Se esperan de a uno: si la función falla (sin red es inmediato) se dice en el acto, sin esperar los
  // reintentos con espera que supabase-js hace sobre la lectura de la tabla (un GET).
  const pedidoDelContexto = Promise.resolve(supabase.rpc('lead_alta_contexto'))
  const pedidoDeLosCampos = Promise.resolve(supabase.from('leads_campos').select('*'))
  const contexto = await pedidoDelContexto
  if (contexto.error) {
    return { ok: false, error: errorDePostgrest(contexto.error) }
  }
  const campos = await pedidoDeLosCampos
  if (campos.error) {
    return { ok: false, error: errorDePostgrest(campos.error) }
  }
  return ok({
    contexto: contextoDeAltaDesde(contexto.data),
    campos: camposDeLeadDesde(campos.data),
  })
}

const memoria = memoriaDeLectura(leer, VIDA_DEL_CONTEXTO_DE_ALTA_MS)

export const leerDatosDelAlta = memoria.leer
export const datosDelAltaEnMemoria = memoria.vigente

// Quien está mirando el alta y quiere releer cuando lo leído deja de valer (un alta rechazada porque un origen o un tipo se apagó mientras se
// escribía) se anota acá; devuelve cómo borrarse.
const oyentes = new Set<() => void>()
export function alOlvidarDatosDelAlta(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

// Quien crea, renombra, ordena, activa, desactiva o elimina un origen o un tipo de lead lo llama al terminar: el alta lee de nuevo.
export function olvidarDatosDelAlta() {
  memoria.olvidar()
  oyentes.forEach((oyente) => {
    oyente()
  })
}
