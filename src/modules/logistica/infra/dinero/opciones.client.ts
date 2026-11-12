// Los catálogos del formulario de gasto, leídos desde el navegador (6.11-1): categorías, monedas y tipos de cambio. Son catálogos de la empresa (decenas de filas: ver
// `TABLAS_ACOTADAS` en las guardas de escala) y se recuerdan un rato.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { memoriaDeLectura } from '@/shared/lib/memoria-de-lectura'
import { createClient } from '@/shared/lib/supabase/browser'
import { z } from 'zod'
import { categoriasDesde, type CategoriaDeGasto } from '../../entities/dinero/categoria'
import { tiposDeCambioDesde, type TipoDeCambio } from '../../entities/dinero/tipo-de-cambio'

export type Moneda = { codigo: string; nombre: string; simbolo: string }
export type OpcionesDeGasto = {
  categorias: CategoriaDeGasto[]
  monedas: Moneda[]
  tiposDeCambio: TipoDeCambio[]
}

export const NO_SE_CARGARON_LAS_OPCIONES = 'No se pudieron cargar las opciones del gasto.'

const MINUTOS_QUE_SE_RECUERDA = 2

const esquemaDeMonedas = z.array(
  z.object({ codigo: z.string(), nombre: z.string(), simbolo: z.string() }),
)

async function leer(): Promise<Resultado<OpcionesDeGasto>> {
  const supabase = createClient()
  const [categorias, monedas, tipos] = await Promise.all([
    supabase
      .from('categorias_gasto')
      .select('id, nombre, proposito, activo, orden')
      .order('orden')
      .order('nombre')
      .limit(200),
    supabase
      .from('monedas')
      .select('codigo, nombre, simbolo')
      .eq('activa', true)
      .order('orden')
      .limit(100),
    supabase
      .from('tipos_cambio')
      .select('id, nombre, moneda_de, moneda_a, valor, es_default, activo, orden')
      .eq('activo', true)
      .order('orden')
      .limit(200),
  ])
  const error = categorias.error ?? monedas.error ?? tipos.error
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const listaDeCategorias = categoriasDesde(categorias.data)
  const listaDeMonedas = esquemaDeMonedas.safeParse(monedas.data)
  const listaDeTipos = tiposDeCambioDesde(tipos.data)
  if (!listaDeCategorias || !listaDeMonedas.success || !listaDeTipos) {
    return fallo('inesperado', NO_SE_CARGARON_LAS_OPCIONES)
  }
  return ok({
    categorias: listaDeCategorias,
    monedas: listaDeMonedas.data,
    tiposDeCambio: listaDeTipos,
  })
}

const memoria = memoriaDeLectura(leer, MINUTOS_QUE_SE_RECUERDA * 60_000)

export const leerOpcionesDeGasto = memoria.leer
