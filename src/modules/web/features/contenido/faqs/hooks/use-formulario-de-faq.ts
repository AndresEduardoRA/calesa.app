'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import {
  cambiosDeFaq,
  validarFaq,
  valoresDeFaq,
  VALORES_DE_FAQ_NUEVA,
  type Faq,
  type ValoresDeFaq,
} from '../../../../entities/contenido/faqs'
import { crearFaq } from '../actions/crear-faq'
import { guardarFaq } from '../actions/guardar-faq'

const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

type Opciones = {
  // El `id` del <form>: el foco va al primer campo con error.
  idDelFormulario: string
  // La pregunta que se edita; nula = «Nueva pregunta». Se toma al abrir: la versión esperada es la de apertura.
  original: Faq | null
  alGuardar: () => void
}

// El formulario de una pregunta frecuente: crear o guardar sólo lo que cambió con la versión que se vio. Un conflicto (otra persona la cambió) se dice dentro
// del formulario con «Recargar»; los motivos de la base van junto a su campo. Nada de lo tipeado se pierde: queda en el borrador hasta guardar.
export function useFormularioDeFaq({ idDelFormulario, original: alAbrir, alGuardar }: Opciones) {
  const [original] = useState(alAbrir)
  const guardado = original ? valoresDeFaq(original) : VALORES_DE_FAQ_NUEVA
  const [inicial] = useState<ValoresDeFaq>(guardado)
  const [valores, setValores] = useState<ValoresDeFaq>(inicial)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [conflicto, setConflicto] = useState<string | null>(null)
  const { mandar, enCurso } = useUnEnvioALaVez()
  const enfocarElError = () => {
    enfocarPrimerError(document.getElementById(idDelFormulario) as HTMLFormElement | null)
  }
  const borrador = useBorradorDeEstado({
    clave: original ? `faq-${original.id}` : 'faq-nueva',
    valores,
    guardado: inicial,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const validado = validarFaq(valores)
  const cambios = original && validado.ok ? cambiosDeFaq(original, validado.datos) : undefined

  async function enviar() {
    if (!validado.ok) {
      setErrores(validado.errores)
      enfocarElError()
      return
    }
    const envio = await mandar(() =>
      original
        ? cambios === null || cambios === undefined
          ? Promise.resolve({ ok: true as const, data: original })
          : enviarAccion(
              guardarFaq({
                id: original.id,
                actualizadoEnEsperado: original.actualizadoEn,
                cambios,
              }),
              MENSAJE_DE_VALIDACION,
            )
        : enviarAccion(crearFaq(validado.datos), MENSAJE_DE_VALIDACION),
    )
    if (envio === null) return
    if (!envio.ok) {
      if (envio.error.codigo === 'conflicto') {
        setConflicto(envio.error.mensaje)
      } else if ('porCampo' in envio && envio.porCampo) {
        setErrores(envio.porCampo)
        enfocarElError()
      } else {
        avisarError(envio.error)
      }
      return
    }
    borrador.limpiar()
    avisarExito(original ? 'Pregunta guardada.' : 'Pregunta creada.')
    alGuardar()
  }

  return {
    valores,
    errores,
    conflicto,
    enCurso,
    cambiar: (cambiosDeValores: Partial<ValoresDeFaq>) => {
      setValores((antes) => ({ ...antes, ...cambiosDeValores }))
      setErrores(({ [Object.keys(cambiosDeValores)[0] ?? '']: _resuelto, ...resto }) => resto)
    },
    // Editando y sin diferencias: nada que guardar.
    sinCambios: original !== null && cambios === null,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    enviar,
    // «Recargar» trae la versión de ahora: lo escrito se descarta (el aviso lo dice).
    recargar: () => {
      borrador.limpiar()
      window.location.reload()
    },
  }
}
