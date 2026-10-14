// Lo que cambiaría una edición del layout de los leads, contado por la base antes de hacerla, y cómo
// se dice. Las reglas son del motor (`shared/lib/campos`); acá se dicen con «lead» y se suma lo que
// es propio de un lead: quién lo ve y cuánto cuesta el alta rápida.
import {
  resumenDeEliminacion as eliminacion,
  resumenDeImpacto as impacto,
  type ImpactoDeCampo,
  type ResumenDeImpacto,
  type Sustantivo,
} from '@/shared/lib/campos'
import type { CambiosDeCampoDeLead } from './cambios-de-campo'
import type { CampoDeLead } from './campo'

export { impactoDesde, type ImpactoDeCampo, type ResumenDeImpacto } from '@/shared/lib/campos'

const LEAD: Sustantivo = { singular: 'lead', plural: 'leads' }

// Desde cuántos datos obligatorios el alta rápida deja de caber en la meta de 25 segundos.
export const REQUERIDOS_QUE_ALARGAN_EL_ALTA = 4

const leads = (cantidad: number) => `${String(cantidad)} ${cantidad === 1 ? 'lead' : 'leads'}`

// Dice, con los números, qué le pasa a lo ya cargado si se hace este cambio. `requeridosActivos` son
// los campos activos que hoy ya son obligatorios, sin contar este.
export function resumenDeImpacto(
  campo: CampoDeLead,
  cambios: CambiosDeCampoDeLead,
  conteo: ImpactoDeCampo,
  requeridosActivos: number,
): ResumenDeImpacto {
  const resumen = impacto(campo, cambios, conteo, LEAD)
  const avisos = [...resumen.avisos]

  if (cambios.soloCartera === false && campo.soloCartera && conteo.conValor > 0) {
    avisos.push(
      `${leads(conteo.conValor)} ${conteo.conValor === 1 ? 'tiene' : 'tienen'} un valor en «${campo.etiqueta}»: quien ve el lead sin tenerlo en su cartera empezará a recibirlo.`,
    )
  }

  if (cambios.requerido === true && !campo.requerido && campo.activo) {
    const datos = requeridosActivos + 1
    const aviso = `El alta rápida pedirá ${String(datos)} ${datos === 1 ? 'dato' : 'datos'} además del teléfono y el nombre.`
    avisos.push(
      datos >= REQUERIDOS_QUE_ALARGAN_EL_ALTA
        ? `${aviso} La meta del alta es de 25 segundos: con tantos datos obligatorios cuesta cumplirla.`
        : aviso,
    )
  }

  return { bloquea: resumen.bloquea, avisos }
}

// Eliminar un campo propio: sólo si ningún lead tiene un valor en él.
export function resumenDeEliminacion(campo: CampoDeLead, conteo: ImpactoDeCampo): ResumenDeImpacto {
  return eliminacion(campo, conteo, LEAD)
}
