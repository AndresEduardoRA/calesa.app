'use client'

import { Campo } from '@/shared/ui/campo'
import type { ErroresDeCampo, ValoresDeCampo } from './tipos'

type Props = {
  minimo: number | null
  maximo: number | null
  alCambiar: (parcial: Pick<ValoresDeCampo, 'minimo'> | Pick<ValoresDeCampo, 'maximo'>) => void
  errores: ErroresDeCampo
  deshabilitado: boolean
}

type PropsDelLimite = {
  nombre: 'minimo' | 'maximo'
  etiqueta: string
  valor: number | null
  alCambiar: (valor: number | null) => void
  ayuda?: string
  error: string | undefined
  deshabilitado: boolean
}

// El mismo control que «Valor por defecto»: el navegador lee la coma o el punto según su idioma. Vacío = sin límite.
function Limite({
  nombre,
  etiqueta,
  valor,
  alCambiar,
  ayuda,
  error,
  deshabilitado,
}: PropsDelLimite) {
  return (
    <Campo
      nombre={nombre}
      etiqueta={etiqueta}
      type="number"
      inputMode="decimal"
      step="any"
      autoComplete="off"
      value={valor ?? ''}
      onChange={(evento) => {
        const numero = evento.target.valueAsNumber
        alCambiar(Number.isFinite(numero) ? numero : null)
      }}
      ayuda={ayuda}
      error={error}
      disabled={deshabilitado}
    />
  )
}

// «Mínimo» y «Máximo» de un número o un monto (9-2). Lado a lado; se apilan cuando no caben.
export function CampoRango({ minimo, maximo, alCambiar, errores, deshabilitado }: Props) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] items-start gap-4">
      <Limite
        nombre="minimo"
        etiqueta="Mínimo"
        valor={minimo}
        alCambiar={(valor) => {
          alCambiar({ minimo: valor })
        }}
        ayuda="Vacío, sin límite. Un valor ya cargado fuera del rango se conserva."
        error={errores.minimo}
        deshabilitado={deshabilitado}
      />
      <Limite
        nombre="maximo"
        etiqueta="Máximo"
        valor={maximo}
        alCambiar={(valor) => {
          alCambiar({ maximo: valor })
        }}
        error={errores.maximo}
        deshabilitado={deshabilitado}
      />
    </div>
  )
}
