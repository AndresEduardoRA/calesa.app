// Lo que cambiaría una edición del layout, contado por la base antes de hacerla, y cómo se dice.
import { z } from 'zod'
import { opcionesQuitadas, type CambiosComunes } from './cambios'
import type { CampoBase, OpcionDeCampo } from './tipos'

export type ImpactoDeCampo = {
  // Registros del ámbito (también los de la papelera).
  total: number
  conValor: number
  sinValor: number
  // Cuántos registros tienen cada opción.
  porOpcion: Record<string, number>
}

const esquemaImpacto = z.object({
  total: z.number(),
  con_valor: z.number(),
  sin_valor: z.number(),
  por_opcion: z.record(z.string(), z.number()),
})

export function impactoDesde(json: unknown): ImpactoDeCampo {
  const impacto = esquemaImpacto.parse(json)
  return {
    total: impacto.total,
    conValor: impacto.con_valor,
    sinValor: impacto.sin_valor,
    porOpcion: impacto.por_opcion,
  }
}

export type ResumenDeImpacto = {
  // Con algo que bloquea no se guarda: la base lo rechazaría igual.
  bloquea: boolean
  // Lo que hay que leer antes de confirmar. Vacío = se guarda sin preguntar.
  avisos: string[]
}

// Cómo se llama lo que lleva estos datos: «vehículo», «lead».
export type Sustantivo = { singular: string; plural: string }

const contados = (cantidad: number, sustantivo: Sustantivo) =>
  `${String(cantidad)} ${cantidad === 1 ? sustantivo.singular : sustantivo.plural}`

type DelCampo = Pick<CampoBase, 'tipo' | 'requerido' | 'etiqueta'> & {
  opciones: readonly OpcionDeCampo[]
}

// Dice, con los números, qué le pasa a lo ya cargado si se hace este cambio.
export function resumenDeImpacto(
  campo: DelCampo,
  cambios: CambiosComunes,
  impacto: ImpactoDeCampo,
  sustantivo: Sustantivo,
): ResumenDeImpacto {
  const avisos: string[] = []
  let bloquea = false

  if (cambios.tipo !== undefined && cambios.tipo !== campo.tipo && impacto.conValor > 0) {
    bloquea = true
    avisos.push(
      `${contados(impacto.conValor, sustantivo)} ${impacto.conValor === 1 ? 'ya tiene' : 'ya tienen'} un valor en «${campo.etiqueta}»: no se puede cambiar su tipo. Desactívalo y crea otro campo.`,
    )
  }

  if (cambios.requerido === true && !campo.requerido && impacto.sinValor > 0) {
    avisos.push(
      `${contados(impacto.sinValor, sustantivo)} ${impacto.sinValor === 1 ? 'no tiene' : 'no tienen'} este dato: ${impacto.sinValor === 1 ? 'no podrá guardarse' : 'no podrán guardarse'} hasta completarlo. Nada cambia hasta que alguien lo edite.`,
    )
  }

  const enUso = opcionesQuitadas(campo, cambios)
    .map((opcion) => ({ opcion, cantidad: impacto.porOpcion[opcion.clave] ?? 0 }))
    .filter(({ cantidad }) => cantidad > 0)
  if (enUso.length > 0) {
    const detalle = enUso
      .map(({ opcion, cantidad }) => `«${opcion.etiqueta}» (${contados(cantidad, sustantivo)})`)
      .join(', ')
    avisos.push(
      `Hay ${sustantivo.plural} con opciones que sacas: ${detalle}. Conservan el valor, pero ya no se podrá elegir.`,
    )
  }

  return { bloquea, avisos }
}

// Eliminar un campo propio: sólo si ningún registro tiene un valor en él.
export function resumenDeEliminacion(
  campo: Pick<CampoBase, 'etiqueta'>,
  impacto: ImpactoDeCampo,
  sustantivo: Sustantivo,
): ResumenDeImpacto {
  if (impacto.conValor > 0) {
    return {
      bloquea: true,
      avisos: [
        `${contados(impacto.conValor, sustantivo)} ${impacto.conValor === 1 ? 'tiene' : 'tienen'} un valor en «${campo.etiqueta}»: no se elimina. Desactívalo para conservar los datos.`,
      ],
    }
  }
  return {
    bloquea: false,
    avisos: [
      `Ningún ${sustantivo.singular} usa «${campo.etiqueta}». Se elimina del layout y no se puede deshacer.`,
    ],
  }
}
