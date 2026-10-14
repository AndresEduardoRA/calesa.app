// Traduce las condiciones del inventario a filtros de PostgREST. Lo que sale del layout
// (`atributos`) y los saneadores son de `@/shared/lib/supabase/consultas`: acá queda lo propio de
// un vehículo (columnas, vitrina y limpieza). Todo valor que escribió la persona pasa por
// `citar()` o `patronContiene()`.
import {
  aplicarCondicionDeAtributo,
  aplicarRango,
  citar,
  patronContiene,
  type Filtrable,
} from '@/shared/lib/supabase/consultas'
import type { Condicion } from '../../entities/filtros'

function columnaEn<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  condicion: Extract<Condicion, { tipo: 'columna_en' }>,
): Consulta {
  const { columna, valores, incluirNulo } = condicion
  if (!incluirNulo) {
    return consulta.in(columna, valores)
  }
  // Los valores son ids que el esquema ya validó contra las opciones: no llevan nada que escapar.
  return valores.length === 0
    ? consulta.is(columna, null)
    : consulta.or(`${columna}.is.null,${columna}.in.(${valores.join(',')})`)
}

// «En vitrina» = publicado y en una fase que hoy publica. Las fases llegan resueltas por la base
// y son ids: no llevan nada que escapar. Sin ninguna, nada está en vitrina: «sí» no trae filas
// (un `in` vacío) y «no» las trae todas.
function enVitrina<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  { valor, fases }: Extract<Condicion, { tipo: 'en_vitrina' }>,
): Consulta {
  if (valor) {
    return consulta.eq('publicado_web', true).in('fase_id', fases)
  }
  return fases.length === 0
    ? consulta
    : consulta.or(`publicado_web.is.false,fase_id.is.null,fase_id.not.in.(${fases.join(',')})`)
}

// «Se limpiará pronto» = importado de apibara y con `limpieza_el` hasta ese día. La fecha la calcula
// la base (`limpieza_el()`, columna calculada: nunca se reconstruye acá), y es nula si el vehículo
// no aplica o tiene una ancla, así que lo retenido nunca entra. `hasta` lo calcula la página (un
// día, no texto de la persona).
function porLimpiar<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  { valor, hasta }: Extract<Condicion, { tipo: 'por_limpiar' }>,
): Consulta {
  if (valor) {
    return consulta.eq('importado_apibara', true).lte('limpieza_el', hasta)
  }
  return consulta.or(`importado_apibara.is.false,limpieza_el.is.null,limpieza_el.gt.${hasta}`)
}

function aplicarUna<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  condicion: Condicion,
): Consulta {
  switch (condicion.tipo) {
    case 'busqueda': {
      const patron = citar(patronContiene(condicion.texto))
      return consulta.or(`titulo.ilike.${patron},vin.ilike.${patron},lote.ilike.${patron}`)
    }
    case 'columna_en':
      return columnaEn(consulta, condicion)
    case 'columna_rango':
      return aplicarRango(consulta, {
        columna: condicion.columna,
        desde: condicion.min,
        hasta: condicion.max,
      })
    case 'en_vitrina':
      return enVitrina(consulta, condicion)
    case 'por_limpiar':
      return porLimpiar(consulta, condicion)
    case 'atributos_contienen':
    case 'atributo_rango_numero':
    case 'atributo_rango_texto':
    case 'atributo_texto':
      return aplicarCondicionDeAtributo(consulta, condicion)
  }
}

export function aplicarCondiciones<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  condiciones: readonly Condicion[],
): Consulta {
  return condiciones.reduce((parcial, condicion) => aplicarUna(parcial, condicion), consulta)
}
