'use client'

import { useState } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { avisarExito } from '@/shared/ui/toasts'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { decirElRechazo } from './decir-el-rechazo'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import {
  avisosDeCambio,
  sinNadaQueGuardar,
  validarTestimonio,
  valoresDeTestimonio,
  VALORES_DE_TESTIMONIO_NUEVO,
  type ValoresDeTestimonio,
} from '../../../../entities/contenido/testimonios-formulario'
import { guardarConFoto, type FotoElegida } from './guardar-con-foto'

type Opciones = {
  // El `id` del <form>: el foco va al primer campo con error.
  idDelFormulario: string
  // El testimonio que se edita; nulo = «Nuevo testimonio». Se toma al abrir: la versión esperada es la de apertura.
  original: Testimonio | null
  alGuardar: () => void
}

// El formulario de un testimonio: crear o guardar sólo lo que cambió con la versión que se vio. La foto elegida se sube desde el navegador al guardar y antes
// de la action; si el guardado falla se descarta lo subido y si la reemplaza o la quita se descarta la anterior (`web_testimonios` no tiene trigger de limpieza).
// Un conflicto se dice dentro del formulario con «Recargar»; los motivos de la base van junto a su campo. Lo tipeado queda en el borrador hasta guardar.
export function useFormularioDeTestimonio({
  idDelFormulario,
  original: alAbrir,
  alGuardar,
}: Opciones) {
  const [original] = useState(alAbrir)
  const [inicial] = useState<ValoresDeTestimonio>(
    original ? valoresDeTestimonio(original) : VALORES_DE_TESTIMONIO_NUEVO,
  )
  const [valores, setValores] = useState<ValoresDeTestimonio>(inicial)
  const [foto, setFoto] = useState<FotoElegida>({ archivo: null, quitada: false })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [conflicto, setConflicto] = useState<string | null>(null)
  const { mandar, enCurso } = useUnEnvioALaVez()
  const enfocarElError = () => {
    enfocarPrimerError(document.getElementById(idDelFormulario) as HTMLFormElement | null)
  }
  const borrador = useBorradorDeEstado({
    clave: original ? `testimonio-${original.id}` : 'testimonio-nuevo',
    valores,
    guardado: inicial,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const validado = validarTestimonio(valores)
  const fotoCambia = foto.archivo !== null || foto.quitada
  const elegir = (archivo: File | null, quitada: boolean) => {
    setFoto({ archivo, quitada })
    setErrores(({ foto: _resuelto, ...resto }) => resto)
  }

  async function enviar() {
    if (!validado.ok) {
      setErrores(validado.errores)
      enfocarElError()
      return
    }
    const envio = await mandar(() => guardarConFoto(original, validado.datos, foto))
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
    avisarExito(original ? 'Testimonio guardado.' : 'Testimonio creado.')
    alGuardar()
  }

  return {
    original,
    valores,
    errores,
    conflicto,
    enCurso,
    foto,
    // Los avisos de lo que pasa con el consentimiento si se guarda ahora (V11), en vivo.
    avisos: original ? avisosDeCambio(original, valores, fotoCambia) : [],
    cambiar: (cambiosDeValores: Partial<ValoresDeTestimonio>) => {
      setValores((antes) => ({ ...antes, ...cambiosDeValores }))
      setErrores(({ [Object.keys(cambiosDeValores)[0] ?? '']: _resuelto, ...resto }) => resto)
    },
    elegirFoto: (archivo: File | null) => {
      elegir(archivo, false)
    },
    quitarFoto: () => {
      elegir(null, true)
    },
    // Editando y sin diferencias: nada que guardar.
    sinCambios: sinNadaQueGuardar(original, validado, fotoCambia),
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial) || fotoCambia,
    enviar,
    // «Recargar» trae la versión de ahora: lo escrito se descarta (el aviso lo dice).
    recargar: () => {
      borrador.limpiar()
      window.location.reload()
    },
  }
}
