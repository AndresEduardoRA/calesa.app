import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  TOPE_DE_TIPOS_PARA_REQUISITOS,
  type TipoParaRequisito,
} from '../../entities/requisitos/opciones'
import type { LectorDeOpcionesDeRequisitos } from '../../entities/requisitos/repositorios'

const NO_SE_LEYO = 'No pudimos leer los tipos de documento. Vuelve a intentar.'

const COLUMNAS = 'id, nombre, formatos, activo'

type Fila = { id: string; nombre: string; formatos: string[]; activo: boolean }

const comoTipo = (f: Fila): TipoParaRequisito => ({
  id: f.id,
  nombre: f.nombre,
  formatos: f.formatos,
  activo: f.activo,
})

// Los tipos de documento que un requisito nombra: los de toda la empresa (`flujo_id` nulo) y los del flujo, cada grupo por el btree de
// `tipos_documento_flujo_id_nombre_key` (flujo_id primero), en el orden en que se ven y con `tope + 1` filas para saber si hay más. Incluye los inactivos
// (un requisito que ya los nombra dice su nombre). Es un catálogo de configuración: a lo sumo 100 por grupo. Leer es de cualquier cuenta con sesión.
export const leerOpcionesDeRequisitos: LectorDeOpcionesDeRequisitos = async (flujoId) => {
  const supabase = await createClient()
  const leer = (flujo: string | null) => {
    const consulta = supabase.from('tipos_documento').select(COLUMNAS)
    return (flujo === null ? consulta.is('flujo_id', null) : consulta.eq('flujo_id', flujo))
      .order('orden')
      .order('nombre')
      .limit(TOPE_DE_TIPOS_PARA_REQUISITOS + 1)
  }
  const [empresa, delFlujo] = await Promise.all([leer(null), leer(flujoId)])
  if (empresa.error) {
    return { ok: false, error: errorDePostgrest(empresa.error) }
  }
  if (delFlujo.error) {
    return { ok: false, error: errorDePostgrest(delFlujo.error) }
  }
  const dePrimero = cortarAlTope(empresa.data, TOPE_DE_TIPOS_PARA_REQUISITOS)
  const deSegundo = cortarAlTope(delFlujo.data, TOPE_DE_TIPOS_PARA_REQUISITOS)
  const tipos = [...dePrimero.filas, ...deSegundo.filas].map(comoTipo)
  return tipos.every((t) => typeof t.id === 'string' && typeof t.nombre === 'string')
    ? ok({ tipos, truncado: dePrimero.hayMas || deSegundo.hayMas })
    : fallo('inesperado', NO_SE_LEYO)
}
