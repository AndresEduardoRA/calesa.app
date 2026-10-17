'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import {
  AYUDA_DE_VEHICULOS_RECORTADOS,
  opcionesDeVehiculo,
  type VehiculoDeLaNota,
} from '../../../entities/vehiculo-de-nota'
import {
  useVehiculosDeLasNotas,
  useVehiculosRecortados,
} from '../../seguimientos/components/vehiculos-de-las-notas'

type Props = {
  nombre: string
  valor: string
  alCambiar: (valor: string) => void
  // El que ya tiene, al editar: se conserva aunque ya no esté entre los del lead.
  actual: VehiculoDeLaNota | null
  error?: string | undefined
  deshabilitado?: boolean
}

// «Vehículo (opcional)» de un seguimiento o un recordatorio: uno de los vehículos del lead que quien
// escribe ve. Sin ninguno que elegir (y sin uno ya puesto), no se dibuja.
export function CampoVehiculo({ nombre, valor, alCambiar, actual, error, deshabilitado }: Props) {
  const opciones = opcionesDeVehiculo(useVehiculosDeLasNotas(), actual)
  const recortado = useVehiculosRecortados()
  if (opciones.length === 1) {
    return null
  }
  return (
    <CampoSeleccion
      nombre={nombre}
      etiqueta="Vehículo (opcional)"
      {...(recortado ? { ayuda: AYUDA_DE_VEHICULOS_RECORTADOS } : {})}
      opciones={opciones.map((o) => ({ valor: o.valor, etiqueta: o.rotulo }))}
      value={valor}
      onChange={(evento) => {
        alCambiar(evento.target.value)
      }}
      error={error}
      disabled={deshabilitado}
    />
  )
}
