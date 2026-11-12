'use client'

import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import {
  LARGO_MAXIMO_DE_CODIGO,
  LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE,
  LARGO_MAXIMO_DE_PAIS,
  type PuertoDeCatalogo,
} from '../../../entities/transporte/catalogo'
import { useFormularioDePuerto } from '../hooks/use-formulario-de-puerto'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Nulo = «Nuevo puerto».
  original: PuertoDeCatalogo | null
  // Ya no se puede guardar lo escrito (otra persona lo quitó mientras se editaba).
  noDisponible: string | null
  alGuardar: () => void
}

const ID_DEL_NOMBRE = 'puerto-nombre'

// «Nuevo puerto» y «Editar» de un puerto (`?panel=nuevo-puerto`, `?panel=editar-puerto&puerto=`): nombre, país, código, orden y si está activo. Quien lo monta le da una `key` por apertura: cada una empieza de cero.
export function ModalDePuerto({ abierto, alCerrar, original, noDisponible, alGuardar }: Props) {
  const f = useFormularioDePuerto({ original, abierto, alCerrar, alGuardar })
  return (
    <ModalDeFormulario
      id="puerto"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar puerto' : 'Nuevo puerto'}
      descripcion="Es el que se elige como origen o destino del transporte de una unidad."
      focoInicial={() => document.getElementById(ID_DEL_NOMBRE)}
      formulario={f}
      noDisponible={noDisponible}
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear puerto', enCurso: 'Creando…' }
      }
    >
      <Campo
        nombre={ID_DEL_NOMBRE}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE + 20}
        value={f.valores.nombre}
        onChange={(evento) => {
          f.escribir({ nombre: evento.target.value })
        }}
        error={f.errores['nombre']}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE)} caracteres. Dos puertos del mismo país no pueden llamarse igual.`}
      />
      <Campo
        nombre="puerto-pais"
        etiqueta="País (opcional)"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_PAIS + 20}
        value={f.valores.pais}
        onChange={(evento) => {
          f.escribir({ pais: evento.target.value })
        }}
        error={f.errores['pais']}
      />
      <Campo
        nombre="puerto-codigo"
        etiqueta="Código (opcional)"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_CODIGO + 20}
        value={f.valores.codigo}
        onChange={(evento) => {
          f.escribir({ codigo: evento.target.value })
        }}
        error={f.errores['codigo']}
        ayuda="Se guarda en mayúsculas y sin espacios."
      />
      <Campo
        nombre="puerto-orden"
        etiqueta="Orden"
        inputMode="numeric"
        autoComplete="off"
        value={f.valores.orden}
        onChange={(evento) => {
          f.escribir({ orden: evento.target.value })
        }}
        error={f.errores['orden']}
        ayuda="Un número entero: los de menor número salen primero."
      />
      <Interruptor
        titulo="Activo"
        ayuda="Un puerto desactivado deja de ofrecerse en lo nuevo; no cambia lo ya cargado ni la oferta del flujo."
        valor={f.valores.activo}
        alCambiar={(activo) => {
          f.escribir({ activo })
        }}
      />
    </ModalDeFormulario>
  )
}
