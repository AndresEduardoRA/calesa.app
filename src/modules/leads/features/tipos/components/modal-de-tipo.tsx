'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { SelectorDeIcono } from '@/shared/ui/selector-de-icono'
import {
  CLAVE_DE_LA_CLASE,
  CLAVE_DEL_ICONO,
  CLAVE_DEL_NOMBRE,
  LARGO_MAXIMO_DE_TIPO,
  type TipoDeLeadConUso,
} from '../../../entities/tipo-de-lead'
import { useFormularioDeTipo } from '../hooks/use-formulario-de-tipo'
import type { TiposDeLead } from '../hooks/use-tipos-de-lead'
import { SelectorDeClase } from './selector-de-clase'

type Props = {
  abierto: boolean
  alCerrar: () => void
  tipos: TiposDeLead
  // Nulo = «Nuevo tipo».
  original: TipoDeLeadConUso | null
  // Ya no se puede guardar lo escrito (otra persona eliminó el tipo que se editaba).
  noDisponible: string | null
}

const IDS = {
  formulario: 'tipo-de-lead',
  nombre: CLAVE_DEL_NOMBRE,
  clase: 'tipo-de-lead-clase',
  icono: 'tipo-de-lead-icono',
} as const

// «Nuevo tipo» y «Editar» de un tipo de lead (`?panel=nuevo-tipo`, `?panel=editar-tipo&tipo=`): el nombre, el icono (del catálogo cerrado) y, al
// crear, la clase, que no cambia después (al editar se ve y no se toca). Activar y ordenar se hacen en la lista. El contrato del modal (preguntar
// antes de cerrar con algo escrito, no cerrarse mientras guarda, el conflicto con «Recargar») es de `ModalDeFormulario`. Quien lo
// monta le da una `key` por apertura: cada una empieza de cero, con un id de intento nuevo.
export function ModalDeTipo({ abierto, alCerrar, tipos, original, noDisponible }: Props) {
  const formulario = useFormularioDeTipo({ tipos, original, alCerrar, abierto })

  return (
    <ModalDeFormulario
      id={IDS.formulario}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar tipo' : 'Nuevo tipo'}
      descripcion="Es el nombre que verá el equipo al elegir qué es un lead."
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
        maxLength={LARGO_MAXIMO_DE_TIPO + 20}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribir(evento.target.value)
        }}
        error={formulario.errores[CLAVE_DEL_NOMBRE]}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DE_TIPO)} caracteres. Dos tipos no pueden llamarse igual.`}
      />
      <SelectorDeClase
        valor={formulario.clase}
        alElegir={formulario.elegirClase}
        error={formulario.errores[CLAVE_DE_LA_CLASE]}
        fija={original !== null}
        idDelPrimero={IDS.clase}
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
