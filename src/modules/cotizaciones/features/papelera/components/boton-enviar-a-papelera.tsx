'use client'

import { Trash2Icon } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { buttonVariants } from '@/shared/ui/button'
import { RUTA_DEL_LISTADO } from '../../../entities/ruta-de-la-hoja'
import { enviarLaGuardadaALaPapelera } from '../hooks/envio-a-papelera'

// El botón de «Enviar a la papelera» de la guardada (4.24-3), `outline` como «Revisiones» y después de ella. Es reversible: sin preguntar, con «Deshacer» en el
// aviso (el tono destructivo queda para purgar). Al entrar lleva al listado: la guardada ya no existe para nadie. No mira lo tipeado sin guardar (P2 a del 4.24-3).
// Es un `<button>` con las clases de `<Button>` (sin el primitivo de Base UI): el JS en frío de `/cotizaciones/[id]` está al tope (`e2e/presupuesto-js.spec.ts`).
export function BotonEnviarALaPapelera({
  id,
  actualizadoEn,
}: {
  id: string
  actualizadoEn: string
}) {
  const router = useRouter()
  const [enCurso, setEnCurso] = useState(false)
  async function alEnviar() {
    setEnCurso(true)
    const entro = await enviarLaGuardadaALaPapelera({ id, actualizadoEn })
    if (entro) {
      router.push(RUTA_DEL_LISTADO as Route)
    } else {
      setEnCurso(false)
    }
  }
  return (
    <button
      type="button"
      className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
      disabled={enCurso}
      onClick={() => {
        void alEnviar()
      }}
    >
      <Trash2Icon aria-hidden />
      Enviar a la papelera
    </button>
  )
}
