'use client'

import { Campo } from '@/shared/ui/campo'
import {
  LARGO_MAXIMO_DEL_RECORDATORIO,
  type ErroresDelRecordatorio,
  type Recordatorio,
  type ValoresDelRecordatorio,
} from '../../../entities/recordatorios'
import { CampoCuando } from './campo-cuando'
import { CampoVehiculo } from './campo-vehiculo'

type Props = {
  // Prefijo de los ids de los campos.
  id: string
  zona: string
  valores: ValoresDelRecordatorio
  errores: ErroresDelRecordatorio
  // El que se edita (para conservar un vehículo que ya no está entre los del lead).
  original: Recordatorio | null
  alCambiarTitulo: (valor: string) => void
  alCambiarCuando: (valor: string) => void
  alCambiarVehiculo: (valor: string) => void
}

// Los campos de un recordatorio, sin `<form>` ni pie: «De qué es», «Cuándo» (el mismo `CampoCuando`,
// con sus atajos, que el «Próximo contacto» del alta y del redactor) y «Vehículo (opcional)» (el mismo
// `CampoVehiculo` del redactor y de las oportunidades). Los monta el modal de agendar y editar.
export function CamposDelRecordatorio({
  id,
  zona,
  valores,
  errores,
  original,
  alCambiarTitulo,
  alCambiarCuando,
  alCambiarVehiculo,
}: Props) {
  return (
    <>
      <Campo
        nombre={`${id}-titulo`}
        etiqueta="De qué es"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_RECORDATORIO}
        value={valores.titulo}
        onChange={(evento) => {
          alCambiarTitulo(evento.target.value)
        }}
        error={errores.titulo}
      />
      <CampoCuando
        nombre={`${id}-cuando`}
        etiqueta="Cuándo"
        valor={valores.cuando}
        alCambiar={alCambiarCuando}
        zona={zona}
        error={errores.recordarEn}
        deshabilitado={false}
      />
      <CampoVehiculo
        nombre={`${id}-vehiculo`}
        valor={valores.vehiculo}
        alCambiar={alCambiarVehiculo}
        actual={original}
      />
    </>
  )
}
