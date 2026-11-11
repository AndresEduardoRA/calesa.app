'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import {
  type ClaveDeGrupo,
  type TipoDeDocumento,
} from '../../../entities/documentos/tipo-de-documento'
import { useFormularioDeTipo } from '../hooks/use-formulario-de-tipo'
import type { TiposDeDocumento } from '../hooks/use-tipos-de-documento'
import { CamposDeFormatos } from './campos-de-formatos'
import { CamposDeTexto, ID_DEL_NOMBRE } from './campos-de-texto'
import { CamposDeVencimiento } from './campos-de-vencimiento'
import { Casilla } from './casilla'

type Props = {
  abierto: boolean
  alCerrar: () => void
  tipos: TiposDeDocumento
  // Nulo = «Nuevo tipo».
  original: TipoDeDocumento | null
  grupo: ClaveDeGrupo
  // El flujo del grupo (nulo = toda la empresa).
  flujoId: string | null
  // Ya no se puede guardar lo escrito (otra persona eliminó el tipo que se editaba).
  noDisponible: string | null
}

const ID_DEL_FORMULARIO = 'tipo-de-documento'

function titulo(original: TipoDeDocumento | null, grupo: ClaveDeGrupo): string {
  if (original) {
    return 'Editar tipo de documento'
  }
  return grupo === 'empresa'
    ? 'Nuevo tipo de documento de toda la empresa'
    : 'Nuevo tipo de documento de este flujo'
}

// «Nuevo tipo» y «Editar» de un tipo de documento (`?panel=nuevo-tipo&de=empresa|flujo`, `?panel=editar-tipo&tipo=<id>`): nombre, descripción, formatos,
// vencimiento con sus días, si se puede mostrar en el portal y, al editar, si está activo. Ordenar se hace en la lista. El contrato del modal
// (preguntar antes de cerrar con algo escrito, no cerrarse mientras guarda, el conflicto con «Recargar») es de `ModalDeFormulario`. Quien lo monta le
// da una `key` por apertura: cada una empieza de cero, con un id de intento nuevo.
export function ModalDeTipo({
  abierto,
  alCerrar,
  tipos,
  original,
  grupo,
  flujoId,
  noDisponible,
}: Props) {
  const f = useFormularioDeTipo({ tipos, original, grupo, flujoId, alCerrar, abierto })
  const { valores } = f

  return (
    <ModalDeFormulario
      id={ID_DEL_FORMULARIO}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={titulo(original, grupo)}
      descripcion="Es lo que se le pide a quien sube un documento de este tipo."
      focoInicial={() => document.getElementById(ID_DEL_NOMBRE)}
      formulario={f}
      noDisponible={noDisponible}
      detalleDelConflicto="Lo que escribiste sigue acá."
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear tipo', enCurso: 'Creando…' }
      }
    >
      <CamposDeTexto valores={valores} errores={f.errores} alEscribir={f.escribir} />
      <CamposDeFormatos
        valores={valores}
        error={f.errores['formatos']}
        alAlternar={f.alternarFormato}
      />
      <CamposDeVencimiento
        valores={valores}
        errores={f.errores}
        alElegirModo={f.elegirModo}
        alEscribir={f.escribir}
      />
      <Casilla
        id="visible-portal"
        etiqueta="Se puede mostrar en el portal"
        marcada={valores.visiblePortal}
        alCambiar={(marcada) => {
          f.escribir({ visiblePortal: marcada }, 'visible_portal_permitido')
        }}
        ayuda="Los documentos ya subidos y mostrados en el portal siguen mostrándose."
      />
      {original ? (
        <Casilla
          id="activo"
          etiqueta="Activo"
          marcada={valores.activo}
          alCambiar={(marcada) => {
            f.escribir({ activo: marcada }, 'activo')
          }}
          ayuda="Uno desactivado sigue nombrando lo que ya lo usa y no se ofrece para lo nuevo."
        />
      ) : null}
    </ModalDeFormulario>
  )
}
