'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import {
  leerDecimal,
  paraEditar,
  porcentajeCanonico,
  porcentajeDesdeFraccion,
  validarFormula,
  type BorradorDeFormula,
} from '../../../entities/cotizador/configuracion'
import type { ConfiguracionDelCotizador } from '../../../entities/cotizador/filas-de-configuracion'
import { publicarConfiguracion } from '../actions/publicar-configuracion'

const MENSAJE_DE_VALIDACION = 'Revisa los valores de la fórmula.'

function borradorDe(vigente: ConfiguracionDelCotizador | null, locale: string): BorradorDeFormula {
  if (!vigente) return { factor: '', recargo: '', redondeo: '' }
  return {
    factor: paraEditar(vigente.factorImportado, locale),
    recargo: porcentajeDesdeFraccion(vigente.recargoLocal, locale),
    redondeo: paraEditar(vigente.redondeo, locale),
  }
}

// ¿Lo escrito es lo mismo que la vigente? Se compara el texto canónico, no lo tipeado («1,35» y «1,3500» son iguales).
function igualALaVigente(
  borrador: BorradorDeFormula,
  vigente: ConfiguracionDelCotizador | null,
  locale: string,
): boolean {
  if (!vigente) return false
  const leido = validarFormula(borrador, (texto, campo) => leerDecimal(texto, campo, locale))
  return (
    leido.ok &&
    leido.datos.factorImportado === vigente.factorImportado &&
    leido.datos.recargoLocal === porcentajeCanonico(vigente.recargoLocal) &&
    leido.datos.redondeo === vigente.redondeo
  )
}

// El formulario de la fórmula vigente (8.12-2, C8): factor, recargo en % y redondeo, llenos con la vigente. Publicar agrega una configuración nueva
// (append-only); quien lo monta le da `key` = id de la vigente, así que tras publicar empieza de cero con la nueva. Un `conflicto` (otra persona publicó
// antes) se dice arriba con «Recargar».
export function useFormulaVigente(vigente: ConfiguracionDelCotizador | null) {
  const { locale } = useRegional()
  const [valores, setValores] = useState<BorradorDeFormula>(() => borradorDe(vigente, locale))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState<ErrorApp | null>(null)
  const { mandar, enCurso } = useUnEnvioALaVez()

  async function publicar() {
    const leido = validarFormula(valores, (texto, campo) => leerDecimal(texto, campo, locale))
    if (!leido.ok) {
      setErrores(leido.errores as Record<string, string>)
      setAviso(null)
      return
    }
    const { factorImportado, recargoLocal, redondeo } = leido.datos
    const envio = await mandar(() =>
      enviarAccion(
        publicarConfiguracion({
          factor: factorImportado,
          recargo: recargoLocal,
          redondeo,
          vigenteEsperada: vigente?.id ?? null,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (envio === null) return
    if (envio.ok) {
      setErrores({})
      setAviso(null)
      avisarExito('Configuración publicada.')
      return
    }
    const porCampo = 'porCampo' in envio ? envio.porCampo : undefined
    setErrores(porCampo ?? {})
    setAviso(porCampo ? null : envio.error)
  }

  return {
    valores,
    errores,
    aviso,
    enCurso,
    sinCambios: igualALaVigente(valores, vigente, locale),
    publicar,
    escribir: (cambios: Partial<BorradorDeFormula>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      setErrores((antes) => {
        const resto = { ...antes }
        for (const clave of Object.keys(cambios)) delete resto[clave]
        return resto
      })
    },
  }
}
