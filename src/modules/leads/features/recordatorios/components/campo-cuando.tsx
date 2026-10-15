'use client'

import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { atajosDeFecha } from '../../../entities/recordatorio'

type Props = {
  nombre: string
  etiqueta: string
  // `aaaa-mm-ddThh:mm` en la zona de la empresa.
  valor: string
  alCambiar: (valor: string) => void
  zona: string
  error?: string
  deshabilitado: boolean
  // «Quitar» deja el campo vacío (un recordatorio opcional).
  quitable?: boolean
}

// Cuándo recordarlo: los atajos («Mañana 09:00», «En 3 días 09:00») van antes del campo, porque un
// campo de fecha y hora tiene una parada de Tab por parte y con el teclado se llega primero a ellos.
export function CampoCuando({
  nombre,
  etiqueta,
  valor,
  alCambiar,
  zona,
  error,
  deshabilitado,
  quitable = false,
}: Props) {
  // Se calculan al mostrarse: «mañana» es el de hoy en la zona de la empresa.
  const atajos = atajosDeFecha(new Date().toISOString(), zona)
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-(length:--text-sm) font-medium text-(--color-ink)">
        {etiqueta}
      </legend>
      <div className="flex flex-wrap gap-2">
        {atajos.map((atajo) => (
          <Button
            key={atajo.clave}
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 md:min-h-7"
            onClick={() => {
              alCambiar(atajo.local)
            }}
            disabled={deshabilitado}
          >
            {atajo.etiqueta}
          </Button>
        ))}
        {quitable && valor !== '' ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-11 md:min-h-7"
            onClick={() => {
              alCambiar('')
            }}
            disabled={deshabilitado}
          >
            Quitar
          </Button>
        ) : null}
      </div>
      <Campo
        nombre={nombre}
        etiqueta="Fecha y hora"
        type="datetime-local"
        value={valor}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
        error={error}
        disabled={deshabilitado}
      />
    </fieldset>
  )
}
