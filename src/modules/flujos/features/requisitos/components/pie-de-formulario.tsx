'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'

type Props = {
  aviso: string | null
  enCurso: boolean
  etiqueta: string
  etiquetaEnCurso: string
  // Sin nada que enviar (la lectura falló, no hay qué elegir): sólo queda cancelar.
  sinEnvio?: boolean
  alCerrar: () => void
}

const BOTON = 'h-11 md:h-8'

// El pie de un formulario de requisito: el aviso de arriba (lo que la base rechazó sin atarlo a un campo), enviar y cancelar.
export function PieDeFormulario({
  aviso,
  enCurso,
  etiqueta,
  etiquetaEnCurso,
  sinEnvio = false,
  alCerrar,
}: Props) {
  return (
    <>
      {aviso === null ? null : <Aviso tono="peligro">{aviso}</Aviso>}
      <div className="flex flex-wrap gap-2">
        {sinEnvio ? null : (
          <Button type="submit" className={BOTON} disabled={enCurso}>
            {enCurso ? etiquetaEnCurso : etiqueta}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className={BOTON}
          disabled={enCurso}
          onClick={alCerrar}
        >
          Cancelar
        </Button>
      </div>
    </>
  )
}
