'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { SelectorDeIcono } from '@/shared/ui/selector-de-icono'
import {
  CLAVE_DEL_ICONO,
  CLAVE_DEL_NOMBRE,
  LARGO_MAXIMO_DE_ORIGEN,
  type OrigenDeLeadConUso,
} from '../../../entities/origen-de-lead'
import { useFormularioDeOrigen } from '../hooks/use-formulario-de-origen'
import type { OrigenesDeLead } from '../hooks/use-origenes-de-lead'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origenes: OrigenesDeLead
  // Nulo = «Nuevo origen».
  original: OrigenDeLeadConUso | null
  // Ya no se puede guardar lo escrito (otra persona eliminó el origen que se editaba).
  noDisponible: string | null
}

const IDS = {
  formulario: 'origen-de-lead',
  nombre: CLAVE_DEL_NOMBRE,
  icono: 'origen-de-lead-icono',
} as const

// «Nuevo origen» y «Editar» de un origen del lead (`?panel=nuevo-origen`, `?panel=editar-origen&origen=`):
// el nombre y el icono, del catálogo cerrado. Activar, ordenar y el «por defecto» se hacen en la lista. El contrato del modal (preguntar antes de
// cerrar con algo escrito, no cerrarse mientras guarda, el conflicto con «Recargar») es de
// `ModalDeFormulario`. Quien lo monta le da una `key` por apertura: cada una empieza de cero, con un
// id de intento nuevo.
export function ModalDeOrigen({ abierto, alCerrar, origenes, original, noDisponible }: Props) {
  const formulario = useFormularioDeOrigen({ origenes, original, alCerrar, abierto })

  return (
    <ModalDeFormulario
      id={IDS.formulario}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar origen' : 'Nuevo origen'}
      descripcion="Es el nombre que verá el equipo al elegir de dónde llegó un lead."
      focoInicial={() => document.getElementById(IDS.nombre)}
      formulario={formulario}
      noDisponible={noDisponible}
      detalleDelConflicto="Lo que escribiste sigue acá."
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear origen', enCurso: 'Creando…' }
      }
    >
      <Campo
        nombre={IDS.nombre}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_ORIGEN + 20}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribir(evento.target.value)
        }}
        error={formulario.errores[CLAVE_DEL_NOMBRE]}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DE_ORIGEN)} caracteres. Dos orígenes no pueden llamarse igual.`}
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
