// «+ Oportunidad» desde una fila del listado: un formulario corto con todo precargado. El embudo (el de por defecto de quien mira), la etapa
// (la inicial) y el estado los pone la base al crear; acá sólo se escribe el título (con el nombre del lead de sugerencia) y, si se quiere,
// el monto. Lo demás (notas, vehículo) se completa después con «Editar» en la ficha.
import {
  datosDeOportunidad,
  LARGO_MAXIMO_DE_TITULO,
  validarOportunidad,
  type DatosDeOportunidad,
  type ErroresDeOportunidad,
} from './oportunidad'

// `?panel=oportunidad-rapida&para=<id>`: lo atiende el listado (con `para`), nunca la ficha ni el drawer.
export const PANEL_OPORTUNIDAD_RAPIDA = 'oportunidad-rapida'

export type ValoresDeOportunidadRapida = { titulo: string; monto: string }

// El título que se ofrece: el nombre del lead, el mismo que usa la oportunidad base (`_lead_oportunidad_base`).
export function tituloSugeridoDeOportunidad(nombreDelLead: string): string {
  return nombreDelLead.trim().slice(0, LARGO_MAXIMO_DE_TITULO)
}

export function valoresDeOportunidadRapida(nombreDelLead: string): ValoresDeOportunidadRapida {
  return { titulo: tituloSugeridoDeOportunidad(nombreDelLead), monto: '' }
}

// Escribió algo que cerrar perdería: otro título o un monto.
export function hayCambiosEnOportunidadRapida(
  valores: ValoresDeOportunidadRapida,
  inicial: ValoresDeOportunidadRapida,
): boolean {
  return valores.titulo !== inicial.titulo || valores.monto.trim() !== inicial.monto
}

export type PedidoDeOportunidadRapida =
  { tipo: 'invalido'; errores: ErroresDeOportunidad } | { tipo: 'crear'; datos: DatosDeOportunidad }

// Lo que viaja al crear, o por qué no sale (el mismo mensaje por campo que la base y que el panel completo).
export function pedidoDeOportunidadRapida(
  valores: ValoresDeOportunidadRapida,
  locale: string,
): PedidoDeOportunidadRapida {
  const completos = { ...valores, notas: '', vehiculo: '' }
  const errores = validarOportunidad(completos, locale)
  if (Object.keys(errores).length > 0) {
    return { tipo: 'invalido', errores }
  }
  return { tipo: 'crear', datos: datosDeOportunidad(completos, locale) }
}
