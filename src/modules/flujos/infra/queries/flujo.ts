import 'server-only'
import { cache } from 'react'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_FLUJO_CONFIGURABLE,
  TOPE_DE_FASES,
  TOPE_DE_FLUJOS,
  TOPE_DE_REGLAS,
  TOPE_DE_REQUISITOS,
  TOPE_DE_ROLES_DE_FLUJO,
  TOPE_DE_TRANSICIONES,
  flujoParaConfigurarDesde,
  flujosConfigurables,
  flujosDesde,
} from '../../entities/flujo'
import type { LectorDeFlujo, LectorDeFlujosConfigurables } from '../../entities/repositorios'

const COLUMNAS_DE_FASE_COMPLETA =
  'id, nombre, descripcion, color, icono, orden, activa, es_inicial, es_final, es_logistica, demora_dias, alerta_cada_horas, nota_obligatoria, permite_contenedor, permite_aduana, cuenta_llegada_repuestos, publica_web, visible_portal, alias_portal, descripcion_portal'
const COLUMNAS_DE_TRANSICION = 'id, de_fase_id, a_fase_id, accion, nota_obligatoria'
const COLUMNAS_DE_REQUISITO =
  'id, fase_id, tipo, bloqueante, orden, clave_dato, config, espera_ambito, espera_fase_id, formatos, max_archivos, min_archivos, notas, tipo_documento_id'

async function leerLasTablas(flujoId: string) {
  const supabase = await createClient()
  const [encabezado, reglas, fases, transiciones, requisitos, rolesPorFase, rolesPorTransicion] =
    await Promise.all([
      supabase
        .from('flujos')
        .select('id, ambito, origen_id, nombre, activo, actualizado_en')
        .eq('id', flujoId)
        .maybeSingle(),
      supabase
        .from('flujos_reglas')
        .select('regla, activa')
        .eq('flujo_id', flujoId)
        .order('regla')
        .limit(TOPE_DE_REGLAS + 1),
      supabase
        .from('fases')
        .select(COLUMNAS_DE_FASE_COMPLETA)
        .eq('flujo_id', flujoId)
        .order('orden')
        .order('nombre')
        .limit(TOPE_DE_FASES + 1),
      supabase
        .from('fases_transiciones')
        .select(COLUMNAS_DE_TRANSICION)
        .eq('flujo_id', flujoId)
        .order('id')
        .limit(TOPE_DE_TRANSICIONES + 1),
      supabase
        .from('fases_requisitos')
        .select(`${COLUMNAS_DE_REQUISITO}, fases!inner(flujo_id)`)
        .eq('fases.flujo_id', flujoId)
        .order('fase_id')
        .order('orden')
        .limit(TOPE_DE_REQUISITOS + 1),
      supabase
        .from('fases_roles')
        .select('fase_id, rol_id, fases!inner(flujo_id)')
        .eq('fases.flujo_id', flujoId)
        .order('fase_id')
        .order('rol_id')
        .limit(TOPE_DE_ROLES_DE_FLUJO + 1),
      supabase
        .from('fases_transiciones_roles')
        .select('transicion_id, rol_id, fases_transiciones!inner(flujo_id)')
        .eq('fases_transiciones.flujo_id', flujoId)
        .order('transicion_id')
        .order('rol_id')
        .limit(TOPE_DE_ROLES_DE_FLUJO + 1),
    ])
  return { encabezado, reglas, fases, transiciones, requisitos, rolesPorFase, rolesPorTransicion }
}

// Cualquier cuenta con sesión lee la configuración (policies `using (true)`): la pantalla filtra qué flujos se ofrecen y la base manda en cada escritura.
// Siete lecturas en paralelo, una vez por request. Cada una pide `tope + 1`: si llega, la bandera de `truncado` lo dice. Las tablas de roles y
// requisitos no traen `flujo_id`: se filtran por el embebido `!inner` (la fase o la transición, que sí lo traen). Índices: `fases_transiciones_flujo_id_idx`,
// `fases_requisitos_fase_id_idx`, `fases_roles_pkey` y las PK de `fases` y `flujos_reglas`; todas son decenas de filas (configuración).
export const getFlujoParaConfigurar: LectorDeFlujo = cache(async (flujoId) => {
  const { encabezado, reglas, fases, transiciones, requisitos, rolesPorFase, rolesPorTransicion } =
    await leerLasTablas(flujoId)
  const falla = [
    encabezado,
    reglas,
    fases,
    transiciones,
    requisitos,
    rolesPorFase,
    rolesPorTransicion,
  ]
    .map((lectura) => lectura.error)
    .find((error) => error !== null)
  if (falla) {
    return { ok: false, error: errorDePostgrest(falla) }
  }
  if (encabezado.data === null) {
    return ok(null)
  }
  const cortadas = {
    reglas: cortarAlTope(reglas.data ?? [], TOPE_DE_REGLAS),
    fases: cortarAlTope(fases.data ?? [], TOPE_DE_FASES),
    transiciones: cortarAlTope(transiciones.data ?? [], TOPE_DE_TRANSICIONES),
    requisitos: cortarAlTope(requisitos.data ?? [], TOPE_DE_REQUISITOS),
    rolesPorFase: cortarAlTope(rolesPorFase.data ?? [], TOPE_DE_ROLES_DE_FLUJO),
    rolesPorTransicion: cortarAlTope(rolesPorTransicion.data ?? [], TOPE_DE_ROLES_DE_FLUJO),
  }
  return ok(
    flujoParaConfigurarDesde({
      encabezado: encabezado.data,
      reglas: cortadas.reglas.filas,
      fases: cortadas.fases.filas,
      transiciones: cortadas.transiciones.filas,
      requisitos: cortadas.requisitos.filas,
      rolesPorFase: cortadas.rolesPorFase.filas,
      rolesPorTransicion: cortadas.rolesPorTransicion.filas,
      truncado: {
        fases: cortadas.fases.hayMas,
        transiciones: cortadas.transiciones.hayMas,
        requisitos: cortadas.requisitos.hayMas,
        roles: cortadas.rolesPorFase.hayMas || cortadas.rolesPorTransicion.hayMas,
      },
    }),
  )
})

// Los flujos que quien mira puede configurar (el selector de la pantalla): todos se leen, `flujosConfigurables()` filtra por sus permisos.
// Un flujo por origen más el de repuestos: decenas de filas, `flujos_origen_unico` y el orden por `ambito` y `nombre`.
export const getFlujosConfigurables: LectorDeFlujosConfigurables = cache(async (permisos) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flujos')
    .select(COLUMNAS_DE_FLUJO_CONFIGURABLE)
    .order('ambito')
    .order('nombre')
    .limit(TOPE_DE_FLUJOS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(flujosConfigurables(flujosDesde(cortarAlTope(data, TOPE_DE_FLUJOS).filas), permisos))
})
