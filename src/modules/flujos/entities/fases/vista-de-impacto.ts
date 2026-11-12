// Qué pasa al jubilar o eliminar una fase, dicho para la confirmación (C6). `fase_impacto()` y `fase_eliminar()` comparten la regla `_fase_uso()`:
// lo que se anuncia es lo que se hace. Los conteos llegan con tope 50 + 1 y se muestran acotados.
import { conteoAcotado, conteoEnFrase, type ConteoAcotado } from '@/shared/lib/conteo'

export const TOPE_DEL_IMPACTO_DE_FASE = 50

export type AccionDeImpacto = 'jubilar' | 'eliminar' | 'bloqueada'
export const MOTIVOS_DE_IMPACTO = [
  'paradas',
  'historial',
  'esperas',
  'unica_inicial',
  'ya_jubilada',
] as const
export type MotivoDeImpacto = (typeof MOTIVOS_DE_IMPACTO)[number]

export type ImpactoDeFase = {
  accion: AccionDeImpacto
  motivo: MotivoDeImpacto | null
  // Unidades (vehículos e ítems de repuestos, también en la papelera) que están en la fase.
  paradas: ConteoAcotado
  hayHistorial: boolean
  // Requisitos de otras fases que esperan a esta.
  esperas: ConteoAcotado
  unicaInicial: boolean
}

export function impactoDeFaseDesde(crudo: {
  accion: AccionDeImpacto
  motivo: MotivoDeImpacto | null
  paradas: number
  hayHistorial: boolean
  esperas: number
  unicaInicial: boolean
}): ImpactoDeFase {
  return {
    accion: crudo.accion,
    motivo: crudo.motivo,
    paradas: conteoAcotado(crudo.paradas, TOPE_DEL_IMPACTO_DE_FASE),
    hayHistorial: crudo.hayHistorial,
    esperas: conteoAcotado(crudo.esperas, TOPE_DEL_IMPACTO_DE_FASE),
    unicaInicial: crudo.unicaInicial,
  }
}

export const MOTIVO_DE_BLOQUEO: Record<'esperas' | 'unica_inicial' | 'ya_jubilada', string> = {
  esperas: 'Otras fases esperan a esta: quita esos requisitos primero.',
  unica_inicial: 'Es la única fase inicial activa: marca otra primero.',
  ya_jubilada: 'Ya está jubilada y sigue en uso: no hay nada más que hacer.',
}

export const AVISO_DE_UNICA_INICIAL =
  'Es la única fase inicial: los vehículos nuevos nacerán sin fase hasta que marques otra.'

function unidadesQueSiguen(paradas: ConteoAcotado): string {
  const frase = conteoEnFrase(paradas)
  return paradas.n === 1 && !paradas.hayMas
    ? `${frase} unidad sigue en ella`
    : `${frase} unidades siguen en ella`
}

export type VistaDeImpacto = {
  etiqueta: 'Eliminar fase' | 'Jubilar fase'
  // El texto principal de la confirmación.
  texto: string
  avisos: string[]
  // Una fase bloqueada se explica y no se confirma.
  puedeConfirmar: boolean
}

function textoDeBloqueo(impacto: ImpactoDeFase): string {
  const motivo = impacto.motivo
  if (motivo === 'esperas' || motivo === 'unica_inicial' || motivo === 'ya_jubilada') {
    return MOTIVO_DE_BLOQUEO[motivo]
  }
  return 'No se puede jubilar ni eliminar esta fase ahora.'
}

export function vistaDelImpacto(nombre: string, impacto: ImpactoDeFase): VistaDeImpacto {
  const avisos =
    impacto.unicaInicial && impacto.accion !== 'bloqueada' ? [AVISO_DE_UNICA_INICIAL] : []
  if (impacto.accion === 'eliminar') {
    return {
      etiqueta: 'Eliminar fase',
      texto: `Se elimina «${nombre}». No tiene unidades ni historial y no se puede deshacer.`,
      avisos,
      puedeConfirmar: true,
    }
  }
  if (impacto.accion === 'jubilar') {
    const uso =
      impacto.motivo === 'historial' || impacto.paradas.n === 0
        ? 'Tiene historial de movimientos'
        : unidadesQueSiguen(impacto.paradas)
    return {
      etiqueta: 'Jubilar fase',
      texto: `Se jubila «${nombre}»: ${uso} y deja de ser destino. Podrás reactivarla.`,
      avisos,
      puedeConfirmar: true,
    }
  }
  return {
    etiqueta: impacto.motivo === 'esperas' ? 'Eliminar fase' : 'Jubilar fase',
    texto: textoDeBloqueo(impacto),
    avisos,
    puedeConfirmar: false,
  }
}

// Lo que la base hizo al confirmar (si el uso cambió entre la lectura y el clic, decidió ella): lo que se avisa.
export function avisoDeLoHecho(accion: 'jubilada' | 'eliminada', nombre: string): string {
  return accion === 'eliminada' ? `Fase «${nombre}» eliminada.` : `Fase «${nombre}» jubilada.`
}
