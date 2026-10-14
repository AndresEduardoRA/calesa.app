import type { ValorDeFormulario, ValoresDeFormulario } from '@/shared/lib/campos'
import type { ErrorApp } from '@/shared/lib/errores'
import { CLAVE_DEL_ALTA } from '../../../entities/alta'
import { normalizarTelefono } from '../../../entities/telefono'
import { avisoDeVerificacion, type Verificacion } from '../../../entities/verificacion'

// El estado del drawer «Nuevo lead» y cómo cambia. Todo puro: el hook sólo lo guarda.

export type Paso = 'datos' | 'seguimiento'

export type Estado = {
  // El del intento: lo genera el navegador y se conserva en cada reintento, así no duplica.
  id: string
  paso: Paso
  valores: ValoresDeFormulario
  errores: Record<string, string>
  // La persona aceptó «Tomar lead» (sólo vale mientras el teléfono siga sin dueño).
  adoptar: boolean
  aviso: string | null
  // Se pidió guardar y no llegó al servidor: sale solo al volver la conexión.
  pendiente: boolean
}

export const nuevoId = () => crypto.randomUUID()

export const limpio = (id: string, valores: ValoresDeFormulario): Estado => ({
  id,
  paso: 'datos',
  valores,
  errores: {},
  adoptar: false,
  aviso: null,
  pendiente: false,
})

// Un dato del primer seguimiento o del recordatorio (los demás son del lead).
const ES_DEL_SEGUIMIENTO = /^(seguimiento|recordatorio)\./

// Si hay un error en algún dato del lead, el paso que lo muestra es el de los datos.
function pasoDe(errores: Record<string, string>, actual: Paso): Paso {
  return Object.keys(errores).some((clave) => !ES_DEL_SEGUIMIENTO.test(clave)) ? 'datos' : actual
}

export function conCambio(antes: Estado, clave: string, valor: ValorDeFormulario): Estado {
  const { [clave]: _resuelto, ...errores } = antes.errores
  return { ...antes, valores: { ...antes.valores, [clave]: valor }, errores, aviso: null }
}

// Lo escrito no pasó la validación del formulario.
export function trasValidacion(antes: Estado, errores: Record<string, string>): Estado {
  return { ...antes, errores, aviso: null, paso: pasoDe(errores, antes.paso) }
}

// El servidor rechazó el guardado. Lo que ya se dice junto a un campo no se repite arriba.
export function trasRechazo(
  antes: Estado,
  error: ErrorApp,
  porCampo?: Record<string, string>,
): Estado {
  const errores = porCampo ?? {}
  return {
    ...antes,
    pendiente: false,
    errores,
    paso: pasoDe(errores, antes.paso),
    aviso: Object.keys(errores).length > 0 ? null : error.mensaje,
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
