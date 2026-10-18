// De dónde se lee una página del listado de leads (5a-fix-1a).
import type { CondicionDeLead } from './filtros'

// De dónde se lee una página del listado (5a-fix-1a). «Míos» de quien tiene «propios» se lee de la cartera de quien mira, que se
// recorre en el orden del listado y cuesta lo que pesa; todo lo demás, de la vista de siempre. Las dos traen las mismas columnas y la
// regla de visibilidad se aplica igual a las dos (son `security_invoker`): sólo cambia por dónde camina la base. Se decide por las
// condiciones porque «míos» es la condición `en_cartera`, la pida la persona, la fuerce la exportación o la sume un filtro por un
// campo privado.
export type FuenteDelListado = 'leads_cartera_vista' | 'leads_vista'

export function fuenteDelListado(condiciones: readonly CondicionDeLead[]): FuenteDelListado {
  return condiciones.some(
    (condicion) => condicion.tipo === 'en_cartera' && condicion.desdeLaCartera,
  )
    ? 'leads_cartera_vista'
    : 'leads_vista'
}
