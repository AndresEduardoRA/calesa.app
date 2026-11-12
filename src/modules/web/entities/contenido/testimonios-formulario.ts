import {
  estadoDeConsentimiento,
  LARGO_DE_CANAL,
  LARGO_DE_CIUDAD,
  LARGO_DE_CLIENTE,
  LARGO_DE_TEXTO,
  LARGO_DE_VEHICULO,
  type Testimonio,
} from './testimonios'

// El formulario de un testimonio y el de su consentimiento (8.02-2): lo puro, sin I/O.

/** Lo que escribe la persona, tal cual. La foto no va aquí: se elige aparte y se sube al guardar. */
export type ValoresDeTestimonio = {
  cliente: string
  ciudad: string
  vehiculo: string
  texto: string
  publicado: boolean
}

/** Lo validado, listo para mandar (ciudad y vehículo vacíos son «sin dato»). `fotoRuta` es la ruta ya subida, o nula para quitarla. */
export type DatosDeTestimonio = {
  cliente: string
  ciudad: string | null
  vehiculo: string | null
  texto: string
  publicado: boolean
  fotoRuta: string | null
}

export const VALORES_DE_TESTIMONIO_NUEVO: ValoresDeTestimonio = {
  cliente: '',
  ciudad: '',
  vehiculo: '',
  texto: '',
  publicado: false,
}

export function valoresDeTestimonio(t: Testimonio): ValoresDeTestimonio {
  return {
    cliente: t.cliente,
    ciudad: t.ciudad ?? '',
    vehiculo: t.vehiculo ?? '',
    texto: t.texto,
    publicado: t.publicado,
  }
}

export type ValidacionDeTestimonio =
  | { ok: true; datos: Omit<DatosDeTestimonio, 'fotoRuta'> }
  | { ok: false; errores: Record<string, string> }

/** Valida el formulario con las reglas de la base. El error de cada campo va por su clave del formulario. */
export function validarTestimonio(valores: ValoresDeTestimonio): ValidacionDeTestimonio {
  const errores: Record<string, string> = {}
  const cliente = valores.cliente.trim()
  const ciudad = valores.ciudad.trim()
  const vehiculo = valores.vehiculo.trim()
  const texto = valores.texto.trim()
  if (cliente === '') {
    errores['cliente'] = 'Escribe el nombre del cliente.'
  } else if (cliente.length > LARGO_DE_CLIENTE) {
    errores['cliente'] = `El nombre admite hasta ${String(LARGO_DE_CLIENTE)} letras.`
  }
  if (ciudad.length > LARGO_DE_CIUDAD) {
    errores['ciudad'] = `La ciudad admite hasta ${String(LARGO_DE_CIUDAD)} letras.`
  }
  if (vehiculo.length > LARGO_DE_VEHICULO) {
    errores['vehiculo'] = `El vehículo admite hasta ${String(LARGO_DE_VEHICULO)} letras.`
  }
  if (texto === '') {
    errores['texto'] = 'Escribe el testimonio.'
  } else if (texto.length > LARGO_DE_TEXTO) {
    errores['texto'] = `El testimonio admite hasta ${String(LARGO_DE_TEXTO)} letras.`
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      cliente,
      ciudad: ciudad === '' ? null : ciudad,
      vehiculo: vehiculo === '' ? null : vehiculo,
      texto,
      publicado: valores.publicado,
    },
  }
}

type CambiosDeTestimonio = Partial<DatosDeTestimonio>

/**
 * Sólo lo que cambió respecto de lo guardado; nulo si no hay nada que guardar. Si cambia el cliente, el texto o la foto de uno con consentimiento vigente, la
 * base anula el consentimiento y lo despublica: no se manda `publicado` (el trigger lo apaga).
 */
export function cambiosDeTestimonio(
  original: Testimonio,
  nuevos: DatosDeTestimonio,
): CambiosDeTestimonio | null {
  const cambios: CambiosDeTestimonio = {}
  if (nuevos.cliente !== original.cliente) cambios.cliente = nuevos.cliente
  if (nuevos.ciudad !== original.ciudad) cambios.ciudad = nuevos.ciudad
  if (nuevos.vehiculo !== original.vehiculo) cambios.vehiculo = nuevos.vehiculo
  if (nuevos.texto !== original.texto) cambios.texto = nuevos.texto
  if (nuevos.fotoRuta !== original.fotoRuta) cambios.fotoRuta = nuevos.fotoRuta
  if (nuevos.publicado !== original.publicado) cambios.publicado = nuevos.publicado
  const anula =
    estadoDeConsentimiento(original) !== 'sin' &&
    (cambios.cliente !== undefined || cambios.texto !== undefined || cambios.fotoRuta !== undefined)
  if (anula) delete cambios.publicado
  return Object.keys(cambios).length === 0 ? null : cambios
}

export const AVISO_QUE_ANULA = 'Cambiar esto borra el consentimiento y lo despublica.'

/**
 * Lo que pasa con el consentimiento si se guarda ahora (V11 de la base): textos para mostrar antes de pulsar «Guardar». `fotoCambia` = se eligió otra
 * foto o se quitó la que había. Un testimonio sin consentimiento, o con el consentimiento retirado, no avisa nada.
 */
export function avisosDeCambio(
  original: Testimonio,
  valores: ValoresDeTestimonio,
  fotoCambia: boolean,
): string[] {
  if (estadoDeConsentimiento(original) !== 'vigente') return []
  const avisos: string[] = []
  if (
    valores.cliente.trim() !== original.cliente ||
    valores.texto.trim() !== original.texto ||
    fotoCambia
  ) {
    avisos.push(AVISO_QUE_ANULA)
  }
  if (original.consentCiudad && valores.ciudad.trim() !== (original.ciudad ?? '')) {
    avisos.push('Cambiar la ciudad apaga el permiso para mostrarla.')
  }
  if (original.consentVehiculo && valores.vehiculo.trim() !== (original.vehiculo ?? '')) {
    avisos.push('Cambiar el vehículo apaga el permiso para mostrarlo.')
  }
  return avisos
}

/** Lo que escribe la persona al registrar el consentimiento. */
export type ValoresDeConsentimiento = {
  canal: string
  ciudad: boolean
  vehiculo: boolean
  foto: boolean
}

export const VALORES_DE_CONSENTIMIENTO_NUEVO: ValoresDeConsentimiento = {
  canal: '',
  ciudad: false,
  vehiculo: false,
  foto: false,
}

/** Con consentimiento vigente el panel empieza con lo registrado; si no, todo apagado (consentir de menos es lo conservador). */
export function valoresDeConsentimiento(t: Testimonio): ValoresDeConsentimiento {
  if (estadoDeConsentimiento(t) !== 'vigente') return VALORES_DE_CONSENTIMIENTO_NUEVO
  return {
    canal: t.consentCanal ?? '',
    ciudad: t.consentCiudad && t.ciudad !== null,
    vehiculo: t.consentVehiculo && t.vehiculo !== null,
    foto: t.consentFoto && t.fotoRuta !== null,
  }
}

export type ValidacionDeConsentimiento =
  { ok: true; datos: ValoresDeConsentimiento } | { ok: false; errores: Record<string, string> }

/** Recorta el canal y apaga cualquier casilla de un dato que el testimonio no tiene. */
export function validarConsentimiento(
  valores: ValoresDeConsentimiento,
  t: Pick<Testimonio, 'ciudad' | 'vehiculo' | 'fotoRuta'>,
): ValidacionDeConsentimiento {
  const canal = valores.canal.trim()
  if (canal === '') {
    return { ok: false, errores: { canal: 'Escribe por qué canal dio su consentimiento.' } }
  }
  if (canal.length > LARGO_DE_CANAL) {
    return {
      ok: false,
      errores: { canal: `El canal admite hasta ${String(LARGO_DE_CANAL)} letras.` },
    }
  }
  return {
    ok: true,
    datos: {
      canal,
      ciudad: valores.ciudad && t.ciudad !== null,
      vehiculo: valores.vehiculo && t.vehiculo !== null,
      foto: valores.foto && t.fotoRuta !== null,
    },
  }
}

/** Editando, sin cambiar la foto y sin diferencias con lo guardado: no hay nada que guardar. */
export function sinNadaQueGuardar(
  original: Testimonio | null,
  validacion: ValidacionDeTestimonio,
  fotoCambia: boolean,
): boolean {
  return (
    original !== null &&
    validacion.ok &&
    !fotoCambia &&
    cambiosDeTestimonio(original, { ...validacion.datos, fotoRuta: original.fotoRuta }) === null
  )
}
