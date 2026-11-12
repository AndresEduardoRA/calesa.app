'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { avisarExito } from '@/shared/ui/toasts'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { decirElRechazo } from './decir-el-rechazo'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import {
  validarConsentimiento,
  valoresDeConsentimiento,
  type ValoresDeConsentimiento,
} from '../../../../entities/contenido/testimonios-formulario'
import { registrarConsentimiento } from '../actions/registrar-consentimiento'

const MENSAJE_DE_VALIDACION = 'Revisa el canal.'

type Opciones = {
  idDelFormulario: string
  // El testimonio al que se le registra: se toma al abrir (su versión es la esperada).
  testimonio: Testimonio
  alGuardar: () => void
}

// El formulario de «Registrar consentimiento»: canal y qué datos autorizó (sólo los que el testimonio tiene). Un conflicto se dice dentro con «Recargar»;
// el motivo de la base sobre el canal va junto a su campo.
export function useFormularioDeConsentimiento({
  idDelFormulario,
  testimonio: alAbrir,
  alGuardar,
}: Opciones) {
  const [testimonio] = useState(alAbrir)
  const [inicial] = useState<ValoresDeConsentimiento>(valoresDeConsentimiento(testimonio))
  const [valores, setValores] = useState<ValoresDeConsentimiento>(inicial)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [conflicto, setConflicto] = useState<string | null>(null)
  const { mandar, enCurso } = useUnEnvioALaVez()
  const enfocarElError = () => {
    enfocarPrimerError(document.getElementById(idDelFormulario) as HTMLFormElement | null)
  }
  const borrador = useBorradorDeEstado({
    clave: `consentimiento-${testimonio.id}`,
    valores,
    guardado: inicial,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })

  async function enviar() {
    const validado = validarConsentimiento(valores, testimonio)
    if (!validado.ok) {
      setErrores(validado.errores)
      enfocarElError()
      return
    }
    const envio = await mandar(() =>
      enviarAccion(
        registrarConsentimiento({
          id: testimonio.id,
          actualizadoEnEsperado: testimonio.actualizadoEn,
          ...validado.datos,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (envio === null) return
    if (!envio.ok) {
      decirElRechazo(envio, {
        alConflicto: setConflicto,
        alCampo: (porCampo) => {
          setErrores(porCampo)
          enfocarElError()
        },
      })
      return
    }
    borrador.limpiar()
    avisarExito('Consentimiento registrado.')
    alGuardar()
  }

  return {
    testimonio,
    valores,
    errores,
    conflicto,
    enCurso,
    cambiar: (cambios: Partial<ValoresDeConsentimiento>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      setErrores({})
    },
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    enviar,
    recargar: () => {
      borrador.limpiar()
      window.location.reload()
    },
  }
}
