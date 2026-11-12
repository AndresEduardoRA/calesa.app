// Las reglas de una fase al editarla en Configuración › Flujos › Fases (5.04). Son espejo de `_fase_validar()`, `_fase_forma()` y `_fase_unico()`
// (`…20261111190403_fases_crear.sql`): la base las vuelve a decir, con estos mismos textos y estos mismos campos en el `hint`, si algo llega de otro
// lado. Aquí sirven para mostrar el error junto al campo sin ir a la base, y para apagar un interruptor que la regla del flujo no deja encender.
import type { AmbitoDeFlujo, FaseParaConfigurar } from '../flujo'

export const LARGO_MAXIMO_DEL_NOMBRE_DE_FASE = 60
export const LARGO_MAXIMO_DE_LA_DESCRIPCION_DE_FASE = 500
export const LARGO_MAXIMO_DEL_ALIAS_DE_FASE = 60
export const HORAS_MAXIMAS_DE_ALERTA = 720
// El color por omisión de `fase_crear()` y el neutro de la paleta.
export const COLOR_NEUTRO_DE_FASE = '#717c93'

// Las claves del `hint` de la base: el error va junto a su campo.
export const CAMPOS_DE_FASE = [
  'nombre',
  'descripcion',
  'color',
  'icono',
  'demora_dias',
  'alerta_cada_horas',
  'es_inicial',
  'es_final',
  'es_logistica',
  'nota_obligatoria',
  'permite_contenedor',
  'permite_aduana',
  'cuenta_llegada_repuestos',
  'publica_web',
  'visible_portal',
  'alias_portal',
  'descripcion_portal',
] as const
export type CampoDeFase = (typeof CAMPOS_DE_FASE)[number]

export function esCampoDeFase(campo: string | null | undefined): campo is CampoDeFase {
  return CAMPOS_DE_FASE.some((c) => c === campo)
}

// Los interruptores que dependen de una regla del flujo (`flujos_reglas`, sin fila = apagada): el campo de la fase y la regla que lo permite.
export const REGLA_DEL_INTERRUPTOR = {
  publica_web: 'vitrina_web',
  visible_portal: 'portal_cliente',
  permite_aduana: 'aduana',
  es_logistica: 'logistica',
} as const
export type CampoConRegla = keyof typeof REGLA_DEL_INTERRUPTOR

// Cómo se llama cada regla ante quien configura.
export const NOMBRE_DE_LA_REGLA: Record<(typeof REGLA_DEL_INTERRUPTOR)[CampoConRegla], string> = {
  vitrina_web: 'Vitrina web',
  portal_cliente: 'Portal del cliente',
  aduana: 'Aduana',
  logistica: 'Logística',
}

// Lo que el flujo dice de sí mismo: su ámbito y las reglas (también las apagadas).
export type ContextoDeFase = {
  ambito: AmbitoDeFlujo
  reglas: readonly { regla: string; activa: boolean }[]
}

export function reglaEncendida(contexto: ContextoDeFase, regla: string): boolean {
  return contexto.reglas.some((r) => r.regla === regla && r.activa)
}

// En el flujo de repuestos esas tres reglas no existen (`_flujo_regla_admitida()`).
const SIN_REGLA_EN_REPUESTOS: readonly CampoConRegla[] = [
  'publica_web',
  'visible_portal',
  'permite_aduana',
]
export const MOTIVO_NO_EXISTE_EN_REPUESTOS = 'No existe en el flujo de repuestos.'

// Por qué un interruptor no se puede encender, o nulo si se puede. Uno ya encendido (dato viejo con la regla apagada) siempre se puede apagar:
// sólo se bloquea encenderlo (D10).
export function motivoDelInterruptor(
  campo: CampoConRegla,
  valorActual: boolean,
  contexto: ContextoDeFase,
): string | null {
  if (valorActual) {
    return null
  }
  if (contexto.ambito === 'repuestos' && SIN_REGLA_EN_REPUESTOS.includes(campo)) {
    return MOTIVO_NO_EXISTE_EN_REPUESTOS
  }
  const regla = REGLA_DEL_INTERRUPTOR[campo]
  return reglaEncendida(contexto, regla)
    ? null
    : `La regla «${NOMBRE_DE_LA_REGLA[regla]}» está apagada en este flujo.`
}

// Los textos de la base, uno por regla (los mismos que dice `_fase_validar()`).
export const MENSAJES_DE_FASE = {
  nombreVacio: 'La fase necesita un nombre.',
  nombreLargo: `El nombre de la fase tiene hasta ${String(LARGO_MAXIMO_DEL_NOMBRE_DE_FASE)} caracteres.`,
  descripcionLarga: `La descripción tiene hasta ${String(LARGO_MAXIMO_DE_LA_DESCRIPCION_DE_FASE)} caracteres.`,
  aliasLargo: `El nombre para el cliente tiene hasta ${String(LARGO_MAXIMO_DEL_ALIAS_DE_FASE)} caracteres.`,
  colorMalo: 'El color va como #rrggbb.',
  iconoMalo: 'El ícono no tiene el formato esperado.',
  demoraMala: 'La demora va en días enteros, desde 0.',
  alertaMala: `La alerta se repite cada 1 a ${String(HORAS_MAXIMAS_DE_ALERTA)} horas.`,
  inicialYFinal: 'Una fase no puede ser inicial y final a la vez.',
  portalSinAlias: 'Para mostrarla en el portal escribe su nombre para el cliente.',
  vitrinaApagada: 'La vitrina web está apagada en este flujo.',
  portalApagado: 'El portal del cliente está apagado en este flujo.',
  aduanaApagada: 'La aduana está apagada en este flujo.',
  logisticaApagada: 'La logística está apagada en este flujo.',
} as const

export function nombreRepetido(nombre: string): string {
  return `Ya hay una fase «${nombre}» en este flujo.`
}

// Lo escrito en el formulario: los números son texto (un campo vacío es «sin valor»).
export type ValoresDeFase = {
  nombre: string
  descripcion: string
  color: string
  icono: string
  demoraDias: string
  alertaCadaHoras: string
  esInicial: boolean
  esFinal: boolean
  esLogistica: boolean
  notaObligatoria: boolean
  permiteContenedor: boolean
  permiteAduana: boolean
  cuentaLlegadaRepuestos: boolean
  publicaWeb: boolean
  visiblePortal: boolean
  aliasPortal: string
  descripcionPortal: string
}

// Lo que la validación aceptó, listo para mandar: los textos recortados y los opcionales vacíos, nulos.
export type DatosDeFase = {
  nombre: string
  descripcion: string | null
  color: string
  icono: string | null
  demoraDias: number | null
  alertaCadaHoras: number | null
  esInicial: boolean
  esFinal: boolean
  esLogistica: boolean
  notaObligatoria: boolean
  permiteContenedor: boolean
  permiteAduana: boolean
  cuentaLlegadaRepuestos: boolean
  publicaWeb: boolean
  visiblePortal: boolean
  aliasPortal: string | null
  descripcionPortal: string | null
}

export type ErroresDeFase = Partial<Record<CampoDeFase, string>>
export type ValidacionDeFase =
  { ok: true; datos: DatosDeFase } | { ok: false; errores: ErroresDeFase }

// La base cuenta caracteres (`char_length`), no unidades UTF-16.
function largo(texto: string): number {
  return Array.from(texto).length
}

function opcional(texto: string): string | null {
  const limpio = texto.trim()
  return limpio === '' ? null : limpio
}

// «» es sin valor; un entero sin signo es válido; lo demás, no. Los rangos los dice cada campo.
function enteroDe(texto: string): { ok: true; n: number | null } | { ok: false } {
  const limpio = texto.trim()
  if (limpio === '') {
    return { ok: true, n: null }
  }
  return /^\d{1,9}$/u.test(limpio) ? { ok: true, n: Number(limpio) } : { ok: false }
}

const COLOR = /^#[0-9a-fA-F]{6}$/u
const ICONO = /^[a-z0-9-]{1,40}$/u

// El nombre y el color: lo único que pide crear una fase, y lo que comparte el formulario del inspector.
export function errorDeNombreDeFase(nombre: string): string | null {
  if (nombre === '') {
    return MENSAJES_DE_FASE.nombreVacio
  }
  return largo(nombre) > LARGO_MAXIMO_DEL_NOMBRE_DE_FASE ? MENSAJES_DE_FASE.nombreLargo : null
}

export function errorDeColorDeFase(color: string): string | null {
  return COLOR.test(color) ? null : MENSAJES_DE_FASE.colorMalo
}

const cuando = (condicion: boolean, mensaje: string): string | null => (condicion ? mensaje : null)

// Un texto opcional que pasa de su largo.
function pasaDe(texto: string | null, maximo: number, mensaje: string): string | null {
  return cuando(texto !== null && largo(texto) > maximo, mensaje)
}

type Entero = ReturnType<typeof enteroDe>

function errorDeAlerta(alerta: Entero): string | null {
  if (!alerta.ok) {
    return MENSAJES_DE_FASE.alertaMala
  }
  const n = alerta.n
  return cuando(n !== null && (n < 1 || n > HORAS_MAXIMAS_DE_ALERTA), MENSAJES_DE_FASE.alertaMala)
}

// Una regla apagada sólo bloquea al encender: el interruptor ya encendido se mira como dato viejo (la base lo rechaza al guardar).
function errorDeRegla(
  campo: CampoConRegla,
  activo: boolean,
  contexto: ContextoDeFase,
  mensaje: string,
): string | null {
  return cuando(activo && !reglaEncendida(contexto, REGLA_DEL_INTERRUPTOR[campo]), mensaje)
}

// Los interruptores que dependen de una regla del flujo.
function erroresDeLasReglas(
  valores: ValoresDeFase,
  contexto: ContextoDeFase,
): [CampoDeFase, string | null][] {
  return [
    [
      'publica_web',
      errorDeRegla('publica_web', valores.publicaWeb, contexto, MENSAJES_DE_FASE.vitrinaApagada),
    ],
    [
      'visible_portal',
      errorDeRegla(
        'visible_portal',
        valores.visiblePortal,
        contexto,
        MENSAJES_DE_FASE.portalApagado,
      ),
    ],
    [
      'permite_aduana',
      errorDeRegla(
        'permite_aduana',
        valores.permiteAduana,
        contexto,
        MENSAJES_DE_FASE.aduanaApagada,
      ),
    ],
    [
      'es_logistica',
      errorDeRegla(
        'es_logistica',
        valores.esLogistica,
        contexto,
        MENSAJES_DE_FASE.logisticaApagada,
      ),
    ],
  ]
}

export function validarFase(valores: ValoresDeFase, contexto: ContextoDeFase): ValidacionDeFase {
  const nombre = valores.nombre.trim()
  const descripcion = opcional(valores.descripcion)
  const icono = opcional(valores.icono)
  const alias = opcional(valores.aliasPortal)
  const descripcionPortal = opcional(valores.descripcionPortal)
  const demora = enteroDe(valores.demoraDias)
  const alerta = enteroDe(valores.alertaCadaHoras)
  const largoDeDescripcion = LARGO_MAXIMO_DE_LA_DESCRIPCION_DE_FASE
  // El orden es el de la base: la primera regla que falla es la que se dice en cada campo.
  const candidatos: [CampoDeFase, string | null][] = [
    ['nombre', errorDeNombreDeFase(nombre)],
    ['descripcion', pasaDe(descripcion, largoDeDescripcion, MENSAJES_DE_FASE.descripcionLarga)],
    [
      'descripcion_portal',
      pasaDe(descripcionPortal, largoDeDescripcion, MENSAJES_DE_FASE.descripcionLarga),
    ],
    ['alias_portal', pasaDe(alias, LARGO_MAXIMO_DEL_ALIAS_DE_FASE, MENSAJES_DE_FASE.aliasLargo)],
    ['color', errorDeColorDeFase(valores.color)],
    ['icono', cuando(icono !== null && !ICONO.test(icono), MENSAJES_DE_FASE.iconoMalo)],
    ['demora_dias', cuando(!demora.ok, MENSAJES_DE_FASE.demoraMala)],
    ['alerta_cada_horas', errorDeAlerta(alerta)],
    ['es_final', cuando(valores.esInicial && valores.esFinal, MENSAJES_DE_FASE.inicialYFinal)],
    [
      'alias_portal',
      cuando(valores.visiblePortal && alias === null, MENSAJES_DE_FASE.portalSinAlias),
    ],
    ...erroresDeLasReglas(valores, contexto),
  ]
  const errores: ErroresDeFase = {}
  for (const [campo, mensaje] of candidatos) {
    // Dos reglas pueden caer en el mismo campo (el alias): se dice la primera.
    if (mensaje !== null && errores[campo] === undefined) {
      errores[campo] = mensaje
    }
  }
  if (Object.keys(errores).length > 0 || !demora.ok || !alerta.ok) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      ...valores,
      nombre,
      descripcion,
      icono,
      demoraDias: demora.n,
      alertaCadaHoras: alerta.n,
      aliasPortal: alias,
      descripcionPortal,
    },
  }
}

// Otra fase inicial y activa del flujo (D6): marcar «Inicial» no desmarca la otra; sólo se avisa.
export function otraFaseInicial(
  fases: readonly Pick<FaseParaConfigurar, 'id' | 'nombre' | 'esInicial' | 'activa'>[],
  idPropio: string | null,
): string | null {
  return fases.find((f) => f.id !== idPropio && f.esInicial && f.activa)?.nombre ?? null
}

export function avisoDeOtraInicial(nombre: string): string {
  return `Ya es inicial «${nombre}». Un vehículo nuevo sólo nace en ella si hay una sola inicial.`
}
