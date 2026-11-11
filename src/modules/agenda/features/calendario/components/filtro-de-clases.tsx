'use client'

import { Button } from '@/shared/ui/button'
import { CLASES_DE_AGENDA, type ClaveDeClase } from '../../../entities/agenda'
import { useParametrosDeAgenda } from '../hooks/use-parametros-de-agenda'

// Las cuatro clases como botones de alternar, con su texto (`aria-pressed`). Sin ninguna elegida no hay nada que ver: se vuelve a «todas».
export function FiltroDeClases({ clases }: { clases: readonly ClaveDeClase[] }) {
  const [, poner] = useParametrosDeAgenda()
  const alternar = (clave: ClaveDeClase) => {
    const quedan = clases.includes(clave) ? clases.filter((c) => c !== clave) : [...clases, clave]
    const todas = quedan.length === 0 || quedan.length === CLASES_DE_AGENDA.length
    const ver = CLASES_DE_AGENDA.filter((c) => quedan.includes(c.clave)).map((c) => c.clave)
    void poner({ ver: todas ? null : ver.join(',') })
  }
  return (
    <ul aria-label="Qué ver" className="flex flex-wrap gap-1.5">
      {CLASES_DE_AGENDA.map((clase) => (
        <li key={clase.clave}>
          <Button
            variant={clases.includes(clase.clave) ? 'secondary' : 'outline'}
            aria-pressed={clases.includes(clase.clave)}
            className="max-md:h-11"
            onClick={() => alternar(clase.clave)}
          >
            {clase.nombre}
          </Button>
        </li>
      ))}
    </ul>
  )
}
