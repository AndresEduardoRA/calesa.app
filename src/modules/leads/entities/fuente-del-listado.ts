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

// ¿Estas condiciones leen «míos»? (La pida la persona, la fuerce la exportación o la sume un filtro por un campo privado.) Es la única ocasión en que importa por
// dónde se lee la cartera de quien ve «todos» (5a-5): sin `en_cartera`, `leads_vista` es la única lectura.
export function pideLaCartera(condiciones: readonly CondicionDeLead[]): boolean {
  return condiciones.some((condicion) => condicion.tipo === 'en_cartera')
}

// Las mismas condiciones, con «míos» leído de la cartera de quien mira. Quien ve «propios» ya lo pide así; quien ve «todos» lo pide sólo si su cartera es corta
// (`leads_cartera_corta()`): por la cartera una persona con 3 leads propios cuesta 5,3 ms y no 81,9 con 212.000 leads, y la dueña (40 % de los leads) se queda
// donde hoy es más barata. Las dos lecturas devuelven las mismas filas (`listado-cartera.sql`).
export function leerMiosDeLaCartera(condiciones: readonly CondicionDeLead[]): CondicionDeLead[] {
  return condiciones.map((condicion) =>
    condicion.tipo === 'en_cartera' ? { ...condicion, desdeLaCartera: true } : condicion,
  )
}

// ¿La cartera de quien mira es corta? Sólo una pista de por dónde leer «míos»: falso si no se pudo saber, la lectura de siempre sirve igual.
export type LectorDeCarteraCorta = () => Promise<boolean>
