'use client'

import { BadgeCheckIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { buttonVariants } from '@/shared/ui/button'
import { aprobarLaCotizacion } from '../hooks/aprobar-la-cotizacion'
import { InsigniaAprobada } from './insignia-aprobada'

type Props = {
  id: string
  numero: number
  // La versión de la cotización (el texto de la base): con ella se aprueba y se vuelve a aprobar la anterior.
  actualizadoEn: string
  aprobada: boolean
  // Por qué no se puede aprobar (sin vehículo, inválida, sin lectura); nulo = se puede.
  motivo: string | null
}

// «Aprobar» en la cabecera de la guardada, y la insignia cuando lo es. Una isla porque comparten estado: al entrar, el botón pasa a la insignia sin refrescar la página
// (remontaría lo tipeado) y «Deshacer» lo devuelve. Un `<button>` con las clases de `<Button>`, sin el primitivo de Base UI. Un envío a la vez. Apagado, dice su motivo al
// lado (`aria-describedby`).
export function BotonAprobar({ id, numero, actualizadoEn, aprobada: inicial, motivo }: Props) {
  const idDelMotivo = useId()
  const [aprobada, setAprobada] = useState(inicial)
  const [enCurso, setEnCurso] = useState(false)
  if (aprobada) {
    return <InsigniaAprobada />
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
        disabled={motivo !== null || enCurso}
        aria-describedby={motivo === null ? undefined : idDelMotivo}
        onClick={() => {
          setEnCurso(true)
          void aprobarLaCotizacion({ id, numero, actualizadoEn, alCambiar: setAprobada }).finally(
            () => {
              setEnCurso(false)
            },
          )
        }}
      >
        <BadgeCheckIcon aria-hidden />
        {enCurso ? 'Aprobando…' : 'Aprobar'}
      </button>
      {motivo === null ? null : (
        <span id={idDelMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </span>
      )}
    </span>
  )
}
