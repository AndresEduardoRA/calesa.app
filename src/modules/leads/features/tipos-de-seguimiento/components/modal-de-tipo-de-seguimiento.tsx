'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { SelectorDeIcono } from '@/shared/ui/selector-de-icono'
import {
  CLAVE_DEL_ICONO,
  CLAVE_DEL_NOMBRE,
  LARGO_MAXIMO_DE_TIPO_DE_SEGUIMIENTO,
  type TipoDeSeguimientoConUso,
} from '../../../entities/tipo-de-seguimiento'
import { useFormularioDeTipoDeSeguimiento } from '../hooks/use-formulario-de-tipo-de-seguimiento'
import type { TiposDeSeguimiento } from '../hooks/use-tipos-de-seguimiento'

type Props = {
  abierto: boolean
  alCerrar: () => void
  tipos: TiposDeSeguimiento
  // Nulo = «Nuevo tipo».
  original: TipoDeSeguimientoConUso | null
  // Ya no se puede guardar lo escrito (otra persona eliminó el tipo que se editaba).
  noDisponible: string | null
}

const IDS = {
  formulario: 'tipo-de-seguimiento',
  nombre: CLAVE_DEL_NOMBRE,
  icono: 'tipo-de-seguimiento-icono',
} as const

// «Nuevo tipo» y «Editar» de un tipo de seguimiento (`?panel=nuevo-tipo-de-seguimiento`, `?panel=editar-tipo-de-seguimiento&…=<id>`): el nombre
// y el icono, del catálogo cerrado. Activar y ordenar se hacen en la lista. El contrato del modal (preguntar antes de cerrar con algo
// escrito, no cerrarse mientras guarda, el conflicto con «Recargar») es de `ModalDeFormulario`. Quien lo monta le da una `key` por
// apertura: cada una empieza de cero, con un id de intento nuevo.
export function ModalDeTipoDeSeguimiento({
  abierto,
  alCerrar,
  tipos,
  original,
  noDisponible,
}: Props) {
  const formulario = useFormularioDeTipoDeSeguimiento({ tipos, original, alCerrar, abierto })

  return (
    <ModalDeFormulario
      id={IDS.formulario}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar tipo de seguimiento' : 'Nuevo tipo de seguimiento'}
      descripcion="Es el nombre que verá el equipo al anotar un seguimiento."
      focoInicial={() => document.getElementById(IDS.nombre)}
      formulario={formulario}
      noDisponible={noDisponible}
      detalleDelConflicto="Lo que escribiste sigue acá."
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear tipo', enCurso: 'Creando…' }
      }
    >
      <Campo
        nombre={IDS.nombre}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_TIPO_DE_SEGUIMIENTO + 20}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribir(evento.target.value)
        }}
        error={formulario.errores[CLAVE_DEL_NOMBRE]}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DE_TIPO_DE_SEGUIMIENTO)} caracteres. Dos tipos no pueden llamarse igual.`}
      />
      <SelectorDeIcono
        valor={formulario.icono}
        alElegir={formulario.elegirIcono}
        error={formulario.errores[CLAVE_DEL_ICONO]}
        idDelPrimero={IDS.icono}
      />
    </ModalDeFormulario>
  )
}
