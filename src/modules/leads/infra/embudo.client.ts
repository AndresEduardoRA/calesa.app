// «Ver más» de una columna del kanban, en el navegador: las siguientes con la sesión de quien mira.
// La RLS decide qué llega; acá no se decide nada.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { LectorDePaginaDeEtapa } from '../entities/repositorios-de-oportunidades'
import { paginaDeEtapaDesde } from '../entities/tablero'

export const leerPaginaDeEtapa: LectorDePaginaDeEtapa = async ({
  etapaId,
  antes,
  tope,
  buscar,
}) => {
  const { data, error } = await createClient().rpc('embudo_etapa_pagina', {
    p_etapa: etapaId,
    p_antes_en: antes.antesEn,
    p_antes_id: antes.antesId,
    p_tope: tope,
    ...(buscar ? { p_buscar: buscar } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeEtapaDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer más oportunidades.')
}
