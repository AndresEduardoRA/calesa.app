import type { ValorDeFormulario, ValoresDeFormulario } from '@/shared/lib/campos'
import type { ErrorApp } from '@/shared/lib/errores'
import { CLAVE_DEL_ALTA } from '../../../entities/alta'
import {
  paisAlCambiarElTelefono,
  paisParaGuardar,
  type TelefonoResuelto,
} from '../../../entities/pais-del-telefono'
import { normalizarTelefono } from '../../../entities/telefono'
import type { ErroresDelSeguimiento, ValoresDelSeguimiento } from '../../../entities/seguimiento'
import { avisoDeVerificacion, type Verificacion } from '../../../entities/verificacion'

// El estado del drawer «Nuevo lead» y cómo cambia. Todo puro: el hook sólo lo guarda.

export type Paso = 'datos' | 'seguimiento'

export type Estado = {
  // El del intento: lo genera el navegador y se conserva en cada reintento, así no duplica.
  id: string
  paso: Paso
  valores: ValoresDeFormulario
  // Lo escrito del primer seguimiento: los mismos valores que el redactor de la ficha.
  seguimiento: ValoresDelSeguimiento
  errores: Record<string, string>
  // Los motivos del primer seguimiento, junto a su campo (la ficha los dice igual).
  erroresDelSeguimiento: ErroresDelSeguimiento
  // La persona aceptó «Tomar lead» (sólo vale mientras el teléfono siga sin dueño).
  adoptar: boolean
  aviso: string | null
  // Se pidió guardar y no llegó al servidor: sale solo al volver la conexión.
  pendiente: boolean
  // Los países que el sistema puso en «País» al tipear el teléfono, o que se eligieron con un botón:
  // mientras «País» tenga uno de ésos (o esté vacío) sigue al número.
  paisesPuestos: readonly string[]
}

export const nuevoId = () => crypto.randomUUID()

export const limpio = (
  id: string,
  valores: ValoresDeFormulario,
  seguimiento: ValoresDelSeguimiento,
): Estado => ({
  id,
  paso: 'datos',
  valores,
  seguimiento,
  errores: {},
  erroresDelSeguimiento: {},
  adoptar: false,
  aviso: null,
  pendiente: false,
  paisesPuestos: [],
})

// Los motivos que la base da para el primer seguimiento vienen con la clave del formulario del alta
// (`hint`); el redactor los dice con la de sus campos.
const CAMPO_DEL_SEGUIMIENTO: Record<string, keyof ErroresDelSeguimiento> = {
  'seguimiento.tipo_id': 'tipoId',
  'seguimiento.titulo': 'titulo',
  'seguimiento.detalle': 'detalle',
  'seguimiento.ocurrido_en': 'ocurridoEn',
  'recordatorio.recordar_en': 'recordatorio',
}

// Separa lo que dijo la base: los motivos del primer seguimiento y los de los datos del lead (cualquier
// otra clave, también una que no conocemos).
export function repartirMotivos(porCampo: Record<string, string>): {
  lead: Record<string, string>
  seguimiento: ErroresDelSeguimiento
} {
  const lead: Record<string, string> = {}
  const seguimiento: ErroresDelSeguimiento = {}
  for (const [clave, motivo] of Object.entries(porCampo)) {
    const campo = CAMPO_DEL_SEGUIMIENTO[clave]
    if (campo) {
      seguimiento[campo] = motivo
    } else {
      lead[clave] = motivo
    }
  }
  return { lead, seguimiento }
}

// Si hay un error en algún dato del lead, el paso que lo muestra es el de los datos; si sólo los hay
// en el primer seguimiento, el del seguimiento.
function pasoDe(
  errores: Record<string, string>,
  delSeguimiento: ErroresDelSeguimiento,
  actual: Paso,
): Paso {
  if (Object.keys(errores).length > 0) {
    return 'datos'
  }
  return Object.keys(delSeguimiento).length > 0 ? 'seguimiento' : actual
}

export function conCambio(antes: Estado, clave: string, valor: ValorDeFormulario): Estado {
  const { [clave]: _resuelto, ...errores } = antes.errores
  return { ...antes, valores: { ...antes.valores, [clave]: valor }, errores, aviso: null }
}

// Lo escrito en un campo del primer seguimiento: su motivo ya no vale y el aviso general tampoco.
export function conSeguimientoCambiado<K extends keyof ValoresDelSeguimiento>(
  antes: Estado,
  clave: K,
  valor: ValoresDelSeguimiento[K],
): Estado {
  const erroresDelSeguimiento = { ...antes.erroresDelSeguimiento }
  delete erroresDelSeguimiento[clave as keyof ErroresDelSeguimiento]
  return {
    ...antes,
    seguimiento: { ...antes.seguimiento, [clave]: valor },
    erroresDelSeguimiento,
    aviso: null,
  }
}

// Lo que vuelve de un borrador: los valores de los datos y los del seguimiento, cada uno sobre lo suyo.
export function conBorradorRepuesto(
  antes: Estado,
  valores: ValoresDeFormulario,
  seguimiento: ValoresDelSeguimiento | null,
): Estado {
  return {
    ...antes,
    valores: { ...antes.valores, ...valores },
    seguimiento: seguimiento ?? antes.seguimiento,
  }
}

type EntradaDelPais = {
  // La clave de «País» en el formulario («atributos.pais»).
  clave: string
  // Con lo que nació el alta (el país de la empresa): también lo puso el sistema.
  inicial: string
  // El teléfono antes y después del cambio (`null` = todavía no es un teléfono).
  anterior: TelefonoResuelto | null
  ahora: TelefonoResuelto | null
}

// Tipear el teléfono lleva «País» al país del número, sin pisar lo que la persona escribió. Lo que
// vale como «puesto por el sistema» incluye el país del número anterior: un borrador repuesto, que no
// recuerda qué puso el sistema, sigue al número igual.
export function conPaisDelTelefono(antes: Estado, entrada: EntradaDelPais): Estado {
  const delAnterior = entrada.anterior ? paisParaGuardar(entrada.anterior) : null
  const sugeridos = [entrada.inicial, ...antes.paisesPuestos, delAnterior ?? ''].filter(
    (valor) => valor !== '',
  )
  const actual = String(antes.valores[entrada.clave] ?? '')
  const cambio = paisAlCambiarElTelefono({ actual, sugeridos, resuelto: entrada.ahora })
  if (!cambio.cambia) {
    return antes
  }
  const puestos = cambio.valor === '' ? antes.paisesPuestos : [...antes.paisesPuestos, cambio.valor]
  return {
    ...antes,
    valores: { ...antes.valores, [entrada.clave]: cambio.valor },
    paisesPuestos: puestos,
  }
}

// Un botón «Es de Canadá»: «País» queda con ese país y, mientras no lo toque la persona, sigue al
// número.
export function conPaisElegido(antes: Estado, clave: string, nombre: string): Estado {
  const conValor = conCambio(antes, clave, nombre)
  return { ...conValor, paisesPuestos: [...antes.paisesPuestos, nombre] }
}

// Lo escrito no pasó la validación del formulario.
export function trasValidacion(antes: Estado, errores: Record<string, string>): Estado {
  return {
    ...antes,
    errores,
    erroresDelSeguimiento: {},
    aviso: null,
    paso: pasoDe(errores, {}, antes.paso),
  }
}

// El primer seguimiento no pasó la validación (los datos del lead sí): se vuelve a él, con sus motivos.
export function trasSeguimientoInvalido(antes: Estado, errores: ErroresDelSeguimiento): Estado {
  return { ...antes, errores: {}, erroresDelSeguimiento: errores, aviso: null, paso: 'seguimiento' }
}

// El servidor rechazó el guardado. Lo que ya se dice junto a un campo no se repite arriba.
export function trasRechazo(
  antes: Estado,
  error: ErrorApp,
  porCampo?: Record<string, string>,
): Estado {
  const { lead, seguimiento } = repartirMotivos(porCampo ?? {})
  const hayMotivos = Object.keys(lead).length + Object.keys(seguimiento).length > 0
  return {
    ...antes,
    pendiente: false,
    errores: lead,
    erroresDelSeguimiento: seguimiento,
    paso: pasoDe(lead, seguimiento, antes.paso),
    aviso: hayMotivos ? null : error.mensaje,
  }
}

const SIN_DUENO = 'Este teléfono está sin dueño: toma el lead para seguir.'

// Un teléfono con dueño, o sin dueño que todavía no se tomó: se dice junto al teléfono y no se sigue.
export function frenadoPorElTelefono(
  verificacion: Verificacion | null,
  adoptarElegido: boolean,
): string | null {
  if (!verificacion) {
    return null
  }
  const aviso = avisoDeVerificacion(verificacion)
  if (aviso.bloquea) {
    return `${aviso.texto} No se puede crear otro lead con este teléfono.`
  }
  return verificacion.estado === 'limbo' && !adoptarElegido ? SIN_DUENO : null
}

export function conTelefonoFrenado(antes: Estado, motivo: string): Estado {
  return {
    ...antes,
    paso: 'datos',
    errores: { [CLAVE_DEL_ALTA.telefono]: motivo },
    aviso: null,
  }
}

// El servidor contestó que no se creó nada: ya existe, es de otra persona o está sin dueño. Se dice
// junto al teléfono y se vuelve a los datos con todo lo escrito.
export function trasDuplicado(antes: Estado, verificacion: Verificacion): Estado {
  const dicho = avisoDeVerificacion(verificacion)
  const motivo = verificacion.estado === 'limbo' ? SIN_DUENO : `${dicho.texto} No se creó nada.`
  return {
    ...antes,
    paso: 'datos',
    pendiente: false,
    adoptar: false,
    errores: { [CLAVE_DEL_ALTA.telefono]: motivo },
    aviso: null,
  }
}

// Al salir del campo: si lo escrito todavía no es un teléfono, se dice (sin esperar a guardar).
export function conTelefonoRevisado(antes: Estado, codigoDePais: string | null): Estado {
  const escrito = antes.valores[CLAVE_DEL_ALTA.telefono]
  if (typeof escrito !== 'string' || escrito.trim() === '') {
    return antes
  }
  const normalizado = normalizarTelefono(codigoDePais, escrito)
  if (normalizado.ok) {
    return antes
  }
  return { ...antes, errores: { ...antes.errores, [CLAVE_DEL_ALTA.telefono]: normalizado.motivo } }
}

// El origen elegido ya no se ofrece (se desactivó mientras se escribía): el campo queda sin elegir y
// lo demás escrito sigue donde estaba.
export function sinElOrigen(antes: Estado): Estado {
  return { ...antes, valores: { ...antes.valores, [CLAVE_DEL_ALTA.origen]: '' } }
}

// Lo que el formulario del alta cambia en su estado sin pasar por el servidor: lo escrito del primer seguimiento, tomar o no el
// lead del limbo, revisar el teléfono al salir del campo y volver al paso de los datos.
export function accionesDelEstado(
  setEstado: (cambio: (antes: Estado) => Estado) => void,
  codigoDePais: string | null,
) {
  return {
    cambiarSeguimiento: <K extends keyof ValoresDelSeguimiento>(
      clave: K,
      valor: ValoresDelSeguimiento[K],
    ) => {
      setEstado((antes) => conSeguimientoCambiado(antes, clave, valor))
    },
    tomar: (tomarlo: boolean) => {
      setEstado((antes) => ({ ...antes, adoptar: tomarlo }))
    },
    revisarTelefono: () => {
      setEstado((antes) => conTelefonoRevisado(antes, codigoDePais))
    },
    volver: () => {
      setEstado((antes) => ({ ...antes, paso: 'datos' }))
    },
  }
}
