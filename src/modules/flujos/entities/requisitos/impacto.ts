// Lo que cambiaría volver bloqueante un requisito, contado por la base antes de hacerlo (`requisito_impacto`), y cómo se dice. Sin I/O.
// Un número que se muestra nunca es el total exacto: la base lee `tope + 1` y revisa a lo sumo `TOPE_DE_UNIDADES_REVISADAS` unidades de la fase.
import { z } from 'zod'
import type { ResumenDeImpacto } from '@/shared/lib/campos/impacto'
import { conteoEnFrase } from '@/shared/lib/conteo'
import { formatearNumero } from '@/shared/lib/formato'
import type { AmbitoDeFlujo } from '../flujo'

// El tope por omisión de `requisito_impacto(p_requisito, p_tope)`: coincide con su `_acotar_pagina(p_tope, 50, 100)`.
export const TOPE_DE_IMPACTO = 50
// Cuántas unidades de la fase revisa a lo sumo la base: si llega, el conteo sale de una muestra.
export const TOPE_DE_UNIDADES_REVISADAS = 1000

export type ImpactoDeRequisito = {
  // Unidades que quedarían fuera de regla (hasta el tope).
  fuera: number
  // Había más que el tope: `fuera` es el tope y no el total.
  hayMas: boolean
  revisadas: number
}

const esquemaDeImpacto = z.object({
  fuera: z.number().int().min(0),
  hay_mas: z.boolean(),
  revisadas: z.number().int().min(0),
})

// `{ fuera, hay_mas, revisadas }` tal como lo devuelve la base; lo que no se entiende es `null` (el repositorio lo dice como error).
export function impactoDesde(crudo: unknown): ImpactoDeRequisito | null {
  const leido = esquemaDeImpacto.safeParse(crudo)
  return leido.success
    ? { fuera: leido.data.fuera, hayMas: leido.data.hay_mas, revisadas: leido.data.revisadas }
    : null
}

const SUSTANTIVO: Record<AmbitoDeFlujo, { singular: string; plural: string }> = {
  vehiculos: { singular: 'vehículo', plural: 'vehículos' },
  repuestos: { singular: 'ítem de repuestos', plural: 'ítems de repuestos' },
}

const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

// El aviso de impacto de `<AvisoDeImpacto>`, o `null` si ninguna unidad queda fuera de regla (se guarda sin preguntar). Nada impide confirmar: las
// unidades no se mueven, quedan marcadas.
export function resumenDeImpacto(
  impacto: ImpactoDeRequisito,
  contexto: { ambito: AmbitoDeFlujo; faseNombre: string; locale?: string },
): ResumenDeImpacto | null {
  if (impacto.fuera === 0 && !impacto.hayMas) {
    return null
  }
  const { ambito, faseNombre, locale } = contexto
  const sustantivo = SUSTANTIVO[ambito]
  const uno = impacto.fuera === 1 && !impacto.hayMas
  const cuantas = conteoEnFrase(
    { n: impacto.fuera, hayMas: impacto.hayMas },
    locale === undefined ? {} : { locale },
  )
  const frase = uno
    ? `1 ${sustantivo.singular} que ya está en «${faseNombre}» quedará fuera de regla. No se mueve: queda marcado.`
    : `${conMayuscula(cuantas)} ${sustantivo.plural} que ya están en «${faseNombre}» quedarán fuera de regla. No se mueven: quedan marcados.`
  const avisos = [frase]
  if (impacto.revisadas >= TOPE_DE_UNIDADES_REVISADAS) {
    avisos.push(
      `Se revisaron las primeras ${formatearNumero(TOPE_DE_UNIDADES_REVISADAS, locale === undefined ? {} : { locale })} unidades de la fase: puede haber más.`,
    )
  }
  return { bloquea: false, avisos }
}
