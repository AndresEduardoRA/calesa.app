import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { AmbitoDeFlujo } from '../../entities/flujo'
import {
  TOPE_DE_FASES_PARA_REQUISITOS,
  TOPE_DE_FLUJOS_PARA_REQUISITOS,
  TOPE_DE_TIPOS_PARA_REQUISITOS,
  type FaseDelOtroFlujo,
  type TipoParaRequisito,
} from '../../entities/requisitos/opciones'
import type { LectorDeOpcionesDeRequisitos } from '../../entities/requisitos/repositorios'

const NO_SE_LEYO = 'No pudimos leer los tipos de documento. Vuelve a intentar.'

const COLUMNAS = 'id, nombre, formatos, activo'

type Fila = { id: string; nombre: string; formatos: string[]; activo: boolean }

const comoTipo = (f: Fila, delFlujo: boolean): TipoParaRequisito => ({
  id: f.id,
  nombre: f.nombre,
  formatos: f.formatos,
  activo: f.activo,
  delFlujo,
})

// Las fases activas del otro ámbito (un vehículo espera a sus repuestos y un repuesto a su vehículo), con el nombre de su flujo. Los flujos por
// `flujos_ambito_nombre` (si existe; es una tabla de configuración de a lo sumo 100) y las fases por `fases_flujo_id_nombre_key` (flujo_id primero), con
// `tope + 1` filas para saber si hay más. Leer es de cualquier cuenta con sesión (`fases: leer`).
async function leerFasesDelOtroFlujo(
  ambito: AmbitoDeFlujo,
): Promise<Resultado<{ fases: FaseDelOtroFlujo[]; hayMas: boolean }>> {
  const supabase = await createClient()
  const otro = ambito === 'vehiculos' ? 'repuestos' : 'vehiculos'
  const flujos = await supabase
    .from('flujos')
    .select('id, nombre')
    .eq('ambito', otro)
    .order('nombre')
    .limit(TOPE_DE_FLUJOS_PARA_REQUISITOS)
  if (flujos.error) {
    return { ok: false, error: errorDePostgrest(flujos.error) }
  }
  if (flujos.data.length === 0) {
    return ok({ fases: [], hayMas: false })
  }
  const fases = await supabase
    .from('fases')
    .select('id, nombre, flujo_id, orden')
    .in(
      'flujo_id',
      flujos.data.map((f) => f.id),
    )
    .eq('activa', true)
    .order('flujo_id')
    .order('orden')
    .limit(TOPE_DE_FASES_PARA_REQUISITOS + 1)
  if (fases.error) {
    return { ok: false, error: errorDePostgrest(fases.error) }
  }
  const cortadas = cortarAlTope(fases.data, TOPE_DE_FASES_PARA_REQUISITOS)
  // En el orden en que se ven los flujos (por nombre); dentro de cada uno, por `orden`.
  const ordenDeFlujo = new Map(flujos.data.map((f, lugar) => [f.id, lugar]))
  const nombreDeFlujo = new Map(flujos.data.map((f) => [f.id, f.nombre]))
  const ordenadas = [...cortadas.filas].sort(
    (a, b) =>
      (ordenDeFlujo.get(a.flujo_id) ?? 0) - (ordenDeFlujo.get(b.flujo_id) ?? 0) ||
      a.orden - b.orden,
  )
  return ok({
    fases: ordenadas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      flujo: nombreDeFlujo.get(f.flujo_id) ?? '',
    })),
    hayMas: cortadas.hayMas,
  })
}

// Lo que un requisito nombra y ofrece, de un flujo: los tipos de documento que nombra (los de toda la empresa y los del flujo, cada grupo por el btree de
// `tipos_documento_flujo_id_nombre_key`, flujo_id primero, en el orden en que se ven y con `tope + 1` filas para saber si hay más; incluye los inactivos: un
// requisito que ya los nombra dice su nombre) y las fases que una espera puede esperar. Son catálogos de configuración: a lo sumo 100 por grupo.
export const leerOpcionesDeRequisitos: LectorDeOpcionesDeRequisitos = async ({
  flujoId,
  ambito,
}) => {
  const supabase = await createClient()
  const leer = (flujo: string | null) => {
    const consulta = supabase.from('tipos_documento').select(COLUMNAS)
    return (flujo === null ? consulta.is('flujo_id', null) : consulta.eq('flujo_id', flujo))
      .order('orden')
      .order('nombre')
      .limit(TOPE_DE_TIPOS_PARA_REQUISITOS + 1)
  }
  const [empresa, delFlujo, deEspera] = await Promise.all([
    leer(null),
    leer(flujoId),
    leerFasesDelOtroFlujo(ambito),
  ])
  if (empresa.error) {
    return { ok: false, error: errorDePostgrest(empresa.error) }
  }
  if (delFlujo.error) {
    return { ok: false, error: errorDePostgrest(delFlujo.error) }
  }
  if (!deEspera.ok) {
    return deEspera
  }
  const dePrimero = cortarAlTope(empresa.data, TOPE_DE_TIPOS_PARA_REQUISITOS)
  const deSegundo = cortarAlTope(delFlujo.data, TOPE_DE_TIPOS_PARA_REQUISITOS)
  const tipos = [
    ...dePrimero.filas.map((f) => comoTipo(f, false)),
    ...deSegundo.filas.map((f) => comoTipo(f, true)),
  ]
  return tipos.every((t) => typeof t.id === 'string' && typeof t.nombre === 'string')
    ? ok({
        tipos,
        truncado: dePrimero.hayMas || deSegundo.hayMas,
        fases: deEspera.data.fases,
        fasesTruncado: deEspera.data.hayMas,
      })
    : fallo('inesperado', NO_SE_LEYO)
}
