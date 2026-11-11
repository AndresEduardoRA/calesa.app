// El flujo entero de un origen (o el de repuestos) tal como lo configura su dueña: fases con todos sus atributos, transiciones, requisitos y
// roles. Sólo lectura (5.02); las escrituras llegan con 5.04 y siguientes, cada una por su RPC. Las filas de la base se validan con Zod en
// el borde (ids con `z.guid()`) y salen en camelCase. La `version` es `flujos.actualizado_en`, un texto ISO: nunca un `Date` (D1).
import { z } from 'zod'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { porOrdenYNombre } from './fase'

// Topes de lo que se lee y se dibuja (`.claude/rules/escala.md`): cada tabla se pide con `tope + 1` y, si llega, su bandera de `truncado` va en true.
export const TOPE_DE_FASES = 200
export const TOPE_DE_TRANSICIONES = 500
export const TOPE_DE_REQUISITOS = 500
export const TOPE_DE_ROLES_DE_FLUJO = 500
export const TOPE_DE_REGLAS = 50
export const TOPE_DE_FLUJOS = 100

export const AMBITOS_DE_FLUJO = ['vehiculos', 'repuestos'] as const
export type AmbitoDeFlujo = (typeof AMBITOS_DE_FLUJO)[number]

const id = z.guid()
const textoONulo = z.string().nullable()
const numeroONulo = z.number().nullable()

export const esquemaDeFase = z.object({
  id,
  nombre: z.string(),
  descripcion: textoONulo,
  color: z.string(),
  icono: textoONulo,
  orden: z.number(),
  activa: z.boolean(),
  es_inicial: z.boolean(),
  es_final: z.boolean(),
  es_logistica: z.boolean(),
  demora_dias: numeroONulo,
  alerta_cada_horas: numeroONulo,
  nota_obligatoria: z.boolean(),
  permite_contenedor: z.boolean(),
  permite_aduana: z.boolean(),
  cuenta_llegada_repuestos: z.boolean(),
  publica_web: z.boolean(),
  visible_portal: z.boolean(),
  alias_portal: textoONulo,
  descripcion_portal: textoONulo,
})

export const esquemaDeTransicion = z.object({
  id,
  de_fase_id: id,
  a_fase_id: id,
  accion: textoONulo,
  nota_obligatoria: z.boolean(),
})

export const esquemaDeRequisito = z.object({
  id,
  fase_id: id,
  tipo: z.enum(['documento', 'dato', 'espera']),
  bloqueante: z.boolean(),
  orden: z.number(),
  clave_dato: textoONulo,
  config: z.json(),
  espera_ambito: z.enum(['padre', 'hijos']).nullable(),
  espera_fase_id: id.nullable(),
  formatos: z.array(z.string()).nullable(),
  max_archivos: numeroONulo,
  min_archivos: numeroONulo,
  notas: textoONulo,
  tipo_documento_id: id.nullable(),
})

const esquemaDeRolDeFase = z.object({ fase_id: id, rol_id: id })
const esquemaDeRolDeTransicion = z.object({ transicion_id: id, rol_id: id })
const esquemaDeRegla = z.object({ regla: z.string(), activa: z.boolean() })
const esquemaDeEncabezado = z.object({
  id,
  ambito: z.enum(AMBITOS_DE_FLUJO),
  origen_id: id.nullable(),
  nombre: z.string(),
  activo: z.boolean(),
  actualizado_en: z.string(),
})

export type FaseParaConfigurar = {
  id: string
  nombre: string
  descripcion: string | null
  color: string
  icono: string | null
  orden: number
  activa: boolean
  esInicial: boolean
  esFinal: boolean
  esLogistica: boolean
  demoraDias: number | null
  alertaCadaHoras: number | null
  notaObligatoria: boolean
  permiteContenedor: boolean
  permiteAduana: boolean
  cuentaLlegadaRepuestos: boolean
  publicaWeb: boolean
  visiblePortal: boolean
  aliasPortal: string | null
  descripcionPortal: string | null
}

export type TransicionParaConfigurar = {
  id: string
  deFaseId: string
  aFaseId: string
  accion: string | null
  notaObligatoria: boolean
}

export type RequisitoParaConfigurar = {
  id: string
  faseId: string
  tipo: 'documento' | 'dato' | 'espera'
  bloqueante: boolean
  orden: number
  claveDato: string | null
  config: z.infer<typeof z.json>
  esperaAmbito: 'padre' | 'hijos' | null
  esperaFaseId: string | null
  formatos: string[] | null
  maxArchivos: number | null
  minArchivos: number | null
  notas: string | null
  tipoDocumentoId: string | null
}

export type FlujoParaConfigurar = {
  id: string
  ambito: AmbitoDeFlujo
  origenId: string | null
  nombre: string
  activo: boolean
  // `flujos.actualizado_en` tal cual, texto ISO: lo que cada escritura devuelve para detectar que otra persona cambió el flujo (D1).
  version: string
  reglas: { regla: string; activa: boolean }[]
  fases: FaseParaConfigurar[]
  transiciones: TransicionParaConfigurar[]
  rolesPorFase: { faseId: string; rolId: string }[]
  rolesPorTransicion: { transicionId: string; rolId: string }[]
  requisitos: RequisitoParaConfigurar[]
  // Una tabla llegó a su tope: se dibujan las primeras y la pantalla lo dice.
  truncado: { fases: boolean; transiciones: boolean; requisitos: boolean; roles: boolean }
}

// Lo que leen las seis consultas de un flujo, sin validar (ya cortadas al tope por quien las leyó).
export type FilasDeFlujo = {
  encabezado: unknown
  reglas: unknown
  fases: unknown
  transiciones: unknown
  requisitos: unknown
  rolesPorFase: unknown
  rolesPorTransicion: unknown
  truncado: FlujoParaConfigurar['truncado']
}

const fase = (f: z.infer<typeof esquemaDeFase>): FaseParaConfigurar => ({
  id: f.id,
  nombre: f.nombre,
  descripcion: f.descripcion,
  color: f.color,
  icono: f.icono,
  orden: f.orden,
  activa: f.activa,
  esInicial: f.es_inicial,
  esFinal: f.es_final,
  esLogistica: f.es_logistica,
  demoraDias: f.demora_dias,
  alertaCadaHoras: f.alerta_cada_horas,
  notaObligatoria: f.nota_obligatoria,
  permiteContenedor: f.permite_contenedor,
  permiteAduana: f.permite_aduana,
  cuentaLlegadaRepuestos: f.cuenta_llegada_repuestos,
  publicaWeb: f.publica_web,
  visiblePortal: f.visible_portal,
  aliasPortal: f.alias_portal,
  descripcionPortal: f.descripcion_portal,
})

const requisito = (r: z.infer<typeof esquemaDeRequisito>): RequisitoParaConfigurar => ({
  id: r.id,
  faseId: r.fase_id,
  tipo: r.tipo,
  bloqueante: r.bloqueante,
  orden: r.orden,
  claveDato: r.clave_dato,
  config: r.config,
  esperaAmbito: r.espera_ambito,
  esperaFaseId: r.espera_fase_id,
  formatos: r.formatos,
  maxArchivos: r.max_archivos,
  minArchivos: r.min_archivos,
  notas: r.notas,
  tipoDocumentoId: r.tipo_documento_id,
})

// El flujo validado y en camelCase, con las fases en el orden de la base y los requisitos por fase y `orden`.
export function flujoParaConfigurarDesde(filas: FilasDeFlujo): FlujoParaConfigurar {
  const encabezado = esquemaDeEncabezado.parse(filas.encabezado)
  return {
    id: encabezado.id,
    ambito: encabezado.ambito,
    origenId: encabezado.origen_id,
    nombre: encabezado.nombre,
    activo: encabezado.activo,
    version: encabezado.actualizado_en,
    reglas: z.array(esquemaDeRegla).parse(filas.reglas),
    fases: z.array(esquemaDeFase).parse(filas.fases).map(fase).sort(porOrdenYNombre),
    transiciones: z
      .array(esquemaDeTransicion)
      .parse(filas.transiciones)
      .map((t) => ({
        id: t.id,
        deFaseId: t.de_fase_id,
        aFaseId: t.a_fase_id,
        accion: t.accion,
        notaObligatoria: t.nota_obligatoria,
      })),
    rolesPorFase: z
      .array(esquemaDeRolDeFase)
      .parse(filas.rolesPorFase)
      .map((r) => ({
        faseId: r.fase_id,
        rolId: r.rol_id,
      })),
    rolesPorTransicion: z
      .array(esquemaDeRolDeTransicion)
      .parse(filas.rolesPorTransicion)
      .map((r) => ({
        transicionId: r.transicion_id,
        rolId: r.rol_id,
      })),
    requisitos: z
      .array(esquemaDeRequisito)
      .parse(filas.requisitos)
      .map(requisito)
      .sort((a, b) => a.faseId.localeCompare(b.faseId) || a.orden - b.orden),
    truncado: filas.truncado,
  }
}

// Un flujo del selector: lo mínimo para elegirlo (la pestaña lleva el nombre y el color del origen, que pone `src/app`).
export type FlujoConfigurable = {
  id: string
  ambito: AmbitoDeFlujo
  origenId: string | null
  nombre: string
  activo: boolean
}

export const COLUMNAS_DE_FLUJO_CONFIGURABLE = 'id, ambito, origen_id, nombre, activo'

const esquemaDeFlujosConfigurables = z.array(
  z.object({
    id,
    ambito: z.enum(AMBITOS_DE_FLUJO),
    origen_id: id.nullable(),
    nombre: z.string(),
    activo: z.boolean(),
  }),
)

export function flujosDesde(filas: unknown): FlujoConfigurable[] {
  return esquemaDeFlujosConfigurables.parse(filas).map((f) => ({
    id: f.id,
    ambito: f.ambito,
    origenId: f.origen_id,
    nombre: f.nombre,
    activo: f.activo,
  }))
}

// Los flujos que estos permisos pueden configurar, también los inactivos: el de un origen con `flujos.configurar` de ese origen; el de repuestos
// con `repuestos.configurar`. Es comodidad de la pantalla: cada escritura la decide la base (`puede_configurar_flujo`, 5.01).
export function flujosConfigurables(
  flujos: readonly FlujoConfigurable[],
  permisos: Permisos,
): FlujoConfigurable[] {
  return flujos.filter((f) =>
    f.ambito === 'repuestos'
      ? puede(permisos, 'repuestos.configurar')
      : puede(permisos, 'flujos.configurar', f.origenId),
  )
}
