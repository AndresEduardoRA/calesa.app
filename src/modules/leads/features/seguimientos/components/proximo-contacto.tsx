'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { CampoCuando } from '../../recordatorios/components/campo-cuando'

type Props = {
  nombre: string
  // `aaaa-mm-ddThh:mm` en la zona de la empresa; vacío = ninguno.
  valor: string
  alCambiar: (valor: string) => void
  zona: string
  error?: string | undefined
  deshabilitado: boolean
}

export const ETIQUETA_DE_PROXIMO_CONTACTO = 'Próximo contacto'
export const TEXTO_DE_PROGRAMAR = 'Programar próximo contacto'
const AYUDA = 'Un recordatorio para ti: cuándo volver a contactar a este lead.'

// El recordatorio que nace con un seguimiento, dicho por lo que hace. Plegado detrás de un botón: anotar
// algo que ya pasó no lo pide ni lo sugiere. Abre solo si ya trae una fecha (un borrador) o un motivo.
export function ProximoContacto({ nombre, valor, alCambiar, zona, error, deshabilitado }: Props) {
  const [abierto, setAbierto] = useState(valor !== '' || error !== undefined)
  if (!abierto && (valor !== '' || error !== undefined)) {
    setAbierto(true)
  }
  // El foco sigue al pliegue: al primer atajo al abrir y al botón «Programar…» al plegar (en los dos
  // casos es el primer botón del contenedor).
  const foco = useRef<'abrir' | 'plegar' | null>(null)
  const contenedor = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (foco.current !== null) {
      contenedor.current?.querySelector('button')?.focus()
      foco.current = null
    }
  }, [abierto])

  return (
    <div ref={contenedor}>
      {abierto ? (
        <CampoCuando
          nombre={nombre}
          etiqueta={ETIQUETA_DE_PROXIMO_CONTACTO}
          ayuda={AYUDA}
          valor={valor}
          alCambiar={alCambiar}
          zona={zona}
          error={error}
          deshabilitado={deshabilitado}
          quitable
          quitarVacio
          alQuitar={() => {
            foco.current = 'plegar'
            setAbierto(false)
          }}
        />
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-7"
          aria-expanded={false}
          onClick={() => {
            foco.current = 'abrir'
            setAbierto(true)
          }}
          disabled={deshabilitado}
        >
          {TEXTO_DE_PROGRAMAR}
        </Button>
      )}
    </div>
  )
}
