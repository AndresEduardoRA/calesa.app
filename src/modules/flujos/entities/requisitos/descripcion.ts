// Un requisito dicho en una línea para quien configura el flujo: lo que pide, no cómo se guarda. Sin I/O. Lo que no se sabe nombrar todavía (los tipos de
// documento llegan aparte) dice su forma genérica; lo que ya no existe lo dice, nunca queda en blanco.
import { formatearNumero } from '@/shared/lib/formato'
import type { RequisitoParaConfigurar } from '../flujo'
import { CLAVE_CON_PORCENTAJE, etiquetaDeClave } from './claves'
import type { OpcionesDeRequisitos } from './opciones'

export const TEXTO_DE_TIPO_SIN_NOMBRE = 'Documento'
export const TEXTO_DE_TIPO_QUE_YA_NO_EXISTE = 'Tipo de documento que ya no existe'

// El porcentaje de `pagos.umbral_pct` (`config.pct`), si es un número.
export function porcentajeDe(config: RequisitoParaConfigurar['config']): number | null {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return null
  }
  const pct = 'pct' in config ? config.pct : null
  return typeof pct === 'number' ? pct : null
}

function textoDeArchivos(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) {
    return min === max
      ? `${String(min)} ${min === 1 ? 'archivo' : 'archivos'}`
      : `${String(min)} a ${String(max)} archivos`
  }
  if (min !== null) {
    return `Al menos ${String(min)} ${min === 1 ? 'archivo' : 'archivos'}`
  }
  if (max !== null) {
    return `Hasta ${String(max)} ${max === 1 ? 'archivo' : 'archivos'}`
  }
  return null
}

const ETIQUETA_DE_FORMATO: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
}

function descripcionDeDocumento(
  r: RequisitoParaConfigurar,
  opciones: OpcionesDeRequisitos | null,
): string {
  const tipo = opciones?.tipos.find((t) => t.id === r.tipoDocumentoId)
  const nombre =
    opciones === null ? TEXTO_DE_TIPO_SIN_NOMBRE : (tipo?.nombre ?? TEXTO_DE_TIPO_QUE_YA_NO_EXISTE)
  const formatos = r.formatos?.length
    ? r.formatos.map((f) => ETIQUETA_DE_FORMATO[f] ?? f).join(', ')
    : null
  return [nombre, textoDeArchivos(r.minArchivos, r.maxArchivos), formatos]
    .filter((parte) => parte !== null)
    .join(' · ')
}

export const TEXTO_DE_FASE_QUE_YA_NO_ESTA = 'una fase que ya no está activa'

function descripcionDeEspera(
  r: RequisitoParaConfigurar,
  opciones: OpcionesDeRequisitos | null,
): string {
  const quien = r.esperaAmbito === 'padre' ? 'el vehículo' : 'un repuesto'
  if (opciones === null) {
    return `Espera a que ${quien} llegue a una fase del otro flujo`
  }
  const fase = opciones.fases.find((f) => f.id === r.esperaFaseId)
  return `Espera a que ${quien} llegue a ${fase ? `«${fase.nombre}»` : TEXTO_DE_FASE_QUE_YA_NO_ESTA}`
}

export function descripcionDeRequisito(
  r: RequisitoParaConfigurar,
  opciones: OpcionesDeRequisitos | null,
): string {
  switch (r.tipo) {
    case 'dato': {
      const clave = r.claveDato ?? ''
      const etiqueta = etiquetaDeClave(clave)
      const pct = clave === CLAVE_CON_PORCENTAJE ? porcentajeDe(r.config) : null
      return pct === null ? etiqueta : `${etiqueta}: ${formatearNumero(pct)} % del precio`
    }
    case 'documento':
      return descripcionDeDocumento(r, opciones)
    case 'espera':
      return descripcionDeEspera(r, opciones)
  }
}

// Las notas del requisito, si hay: la segunda línea gris.
export function notasDeRequisito(r: RequisitoParaConfigurar): string | null {
  return r.notas !== null && r.notas.trim() !== '' ? r.notas : null
}

export function textoDeBloqueo(r: RequisitoParaConfigurar): 'Bloqueante' | 'Informativo' {
  return r.bloqueante ? 'Bloqueante' : 'Informativo'
}
