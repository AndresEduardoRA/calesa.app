'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { CampoDelFormulario, Formulario } from '../../../entities/descarga'
import type { OrigenDeLaTarjeta } from '../../../entities/tarjetas'

type Props = {
  formulario: Formulario
  alCambiar: (campo: CampoDelFormulario, valor: string) => void
  origenes: readonly OrigenDeLaTarjeta[]
  errores: Partial<Record<CampoDelFormulario, string>>
  apagados: boolean
}

// El origen (vehículos: obligatorio; cotizaciones: optativo, con «Todos los orígenes») y el rango de fechas de una tarjeta. Los ids llevan
// la entidad delante: hay tres tarjetas en la misma pantalla.
export function CamposDeLaTarjeta({ formulario, alCambiar, origenes, errores, apagados }: Props) {
  const { entidad } = formulario
  return (
    <>
      {entidad === 'leads' ? null : (
        <CampoSeleccion
          nombre={`${entidad}-origen`}
          etiqueta="Origen"
          disabled={apagados}
          value={formulario.origen}
          onChange={(evento) => alCambiar('origen', evento.target.value)}
          error={errores.origen}
          opciones={[
            ...(entidad === 'cotizaciones' ? [{ valor: '', etiqueta: 'Todos los orígenes' }] : []),
            ...origenes.map((origen) => ({ valor: origen.id, etiqueta: origen.nombre })),
          ]}
        />
      )}
      <Campo
        nombre={`${entidad}-desde`}
        etiqueta="Desde"
        type="date"
        disabled={apagados}
        value={formulario.desde}
        onChange={(evento) => alCambiar('desde', evento.target.value)}
        error={errores.desde}
      />
      <Campo
        nombre={`${entidad}-hasta`}
        etiqueta="Hasta"
        type="date"
        disabled={apagados}
        value={formulario.hasta}
        onChange={(evento) => alCambiar('hasta', evento.target.value)}
        error={errores.hasta}
      />
    </>
  )
}
