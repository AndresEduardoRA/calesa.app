// La actividad desde el navegador, con la sesión de quien mira: «Ver más», «Ir a una fecha» y, al abrir un cambio, su diff.
import { createClient } from '@/shared/lib/supabase/browser'
import type { PedidoDeActividad } from '../entities/filtros'
import { leerCampos, leerPagina, leerUnDiff, type PedidoDeCampos } from './consultas'

export function leerPaginaDeActividad(pedido: PedidoDeActividad) {
  return leerPagina(createClient(), pedido)
}

export function leerDiff(id: number) {
  return leerUnDiff(createClient(), id)
}

export function leerCamposDeAtributos(pedido: PedidoDeCampos) {
  return leerCampos(createClient(), pedido)
}
