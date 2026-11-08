'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import {
  LARGO_MAXIMO_DEL_NOMBRE_DE_TONO,
  TEMAS_DE_UN_TONO,
  type Tono,
} from '../../../entities/diseno/tonos'
import { useFormularioDeTono } from '../hooks/use-formulario-de-tono'
import type { Tonos } from '../hooks/use-tonos'
import { CamposDeColor } from './campos-de-color'

type Props = {
  abierto: boolean
  alCerrar: () => void
  tonos: Tonos
  // Nulo = «Nuevo tono».
  original: Tono | null
  // Ya no se puede guardar lo escrito (otra persona eliminó el tono que se editaba).
  noDisponible: string | null
}

const IDS = { formulario: 'tono', nombre: 'nombre' } as const

// «Nuevo tono» y «Editar tono» (`?panel=nuevo-tono`, `?panel=editar-tono&tono=<id>`): el nombre y, por tema, fondo, borde y tinta. De él sale la clave del tono, que no
// cambia nunca (la nombran los grupos de una fórmula). El contrato del modal (preguntar antes de cerrar con algo escrito, no cerrarse mientras guarda, el conflicto
// con «Recargar» que conserva lo escrito) es de `ModalDeFormulario`. Quien lo monta le da una `key` por apertura: cada una empieza de cero, con un id de intento nuevo.
export function ModalDeTono({ abierto, alCerrar, tonos, original, noDisponible }: Props) {
  const formulario = useFormularioDeTono({ tonos, original, alCerrar, abierto })

  return (
    <ModalDeFormulario
      id={IDS.formulario}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar tono' : 'Nuevo tono'}
      descripcion={
        original
          ? 'La clave del tono no cambia: los grupos de una fórmula lo nombran por ella.'
          : 'La tinta tiene que leerse sobre el fondo en los dos temas (contraste AA, 4,5:1).'
      }
      focoInicial={() => document.getElementById(IDS.nombre)}
      focoAlCerrar={() =>
        (original
          ? document.querySelector<HTMLElement>(`[data-editar-tono="${original.id}"]`)
          : null) ?? true
      }
      formulario={formulario}
      noDisponible={noDisponible}
      detalleDelConflicto="Lo que escribiste sigue acá."
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear tono', enCurso: 'Creando…' }
      }
    >
      <Campo
        nombre={IDS.nombre}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_NOMBRE_DE_TONO + 20}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribirNombre(evento.target.value)
        }}
        error={formulario.errores['nombre']}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DEL_NOMBRE_DE_TONO)} caracteres. Dos tonos no pueden llamarse igual.`}
      />
      {TEMAS_DE_UN_TONO.map((tema) => (
        <CamposDeColor
          key={tema}
          tema={tema}
          colores={formulario.colores[tema]}
          errores={formulario.errores}
          alEscribir={(color, valor) => {
            formulario.escribirColor(tema, color, valor)
          }}
        />
      ))}
    </ModalDeFormulario>
  )
}
