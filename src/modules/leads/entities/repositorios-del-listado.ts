import type { ConteoAcotado } from '@/shared/lib/conteo'
import type { Resultado } from '@/shared/lib/errores'
import type { Cursor } from '@/shared/lib/paginacion'
import type { PaginaDeLeads } from './candidatos'
import type { CondicionDeLead } from './filtros'

// Lo que el listado de leads le pide a la base (parte de `repositorios.ts`, que llegaba al máximo de líneas por archivo).

export type PedidoDeListado = {
  condiciones: readonly CondicionDeLead[]
  cursor: Cursor | null
  tamano: number
  // Las claves de los campos «en tabla»: de `atributos` sólo se pide lo que se dibuja.
  clavesDeTabla: readonly string[]
  // Sin el tope del recorrido de un campo público (4.03, 5a-9): una exportación quiere todo, y el texto y el rango de un campo público los lee de la vista, completos.
  sinTope?: boolean
}

// Una página de leads de `leads_vista`. Lo que hay lo decide la RLS: acá no se filtra por permiso.
export type BuscadorDeLeads = (pedido: PedidoDeListado) => Promise<Resultado<PaginaDeLeads>>

// Cuántos leads cumplen esas condiciones, entre los que quien mira ve, **hasta `tope`** (el aviso de
// tachados ocultos, el tope de una exportación). Nunca el total exacto.
export type ContadorDeLeads = (
  condiciones: readonly CondicionDeLead[],
  tope: number,
) => Promise<Resultado<ConteoAcotado>>
