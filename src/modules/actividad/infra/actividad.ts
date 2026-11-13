import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { PedidoDeActividad } from '../entities/filtros'
import { leerPagina, leerPersonas } from './consultas'

// La primera página de `/actividad` y las personas del filtro, en el servidor y con la sesión de quien mira.
export async function getPaginaDeActividad(pedido: PedidoDeActividad) {
  return leerPagina(await createClient(), pedido)
}

export async function getPersonasDeLaActividad() {
  return leerPersonas(await createClient())
}
