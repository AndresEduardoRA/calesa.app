import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { choquesDesde, type LectorDeChoques } from '../../entities/ajustes-de-leads'

// La primera página de los choques de teléfonos extra (Configuración › Leads › «Teléfonos extra»): `telefonos_extra_choques()`, con
// `leads.configurar`. Recorre `leads_telefonos` por su clave (`leads_telefonos_pkey`) con tope de recorrido y no cuenta nada: el
// tamaño es el de la base (`_acotar_pagina`). «Ver más» sale del navegador con `infra/choques.client.ts`.
export const getChoquesDeTelefonos: LectorDeChoques = async (cursor) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('telefonos_extra_choques', {
    ...(cursor === null ? {} : { p_despues: cursor }),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = choquesDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer los teléfonos repetidos.')
}
