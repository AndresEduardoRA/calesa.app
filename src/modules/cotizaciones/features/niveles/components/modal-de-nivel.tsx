'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import {
  CLAVE_DEL_NOMBRE,
  LARGO_MAXIMO_DE_NIVEL,
  type NivelDeAcceso,
} from '../../../entities/nivel'
import { useFormularioDeNivel } from '../hooks/use-formulario-de-nivel'
import type { Niveles } from '../hooks/use-niveles'

type Props = {
  abierto: boolean
  alCerrar: () => void
  niveles: Niveles
  // Nulo = «Nuevo nivel».
  original: NivelDeAcceso | null
  // Ya no se puede guardar lo escrito (otra persona eliminó el nivel que se renombraba).
  noDisponible: string | null
}

const IDS = { formulario: 'nivel', nombre: CLAVE_DEL_NOMBRE } as const

// «Nuevo nivel» y «Renombrar» (`?panel=nuevo-nivel`, `?panel=renombrar-nivel&nivel=<id>`): sólo el nombre. De él sale la clave del nivel, que no
// cambia nunca; renombrar cambia el nombre que se lee en el diseño y en Roles y permisos. El contrato del modal (preguntar antes de cerrar con
// algo escrito, no cerrarse mientras guarda, el conflicto con «Recargar» que conserva lo escrito) es de `ModalDeFormulario`. Quien lo monta le
// da una `key` por apertura: cada una empieza de cero, con un id de intento nuevo.
export function ModalDeNivel({ abierto, alCerrar, niveles, original, noDisponible }: Props) {
  const formulario = useFormularioDeNivel({ niveles, original, alCerrar, abierto })

  return (
    <ModalDeFormulario
      id={IDS.formulario}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Renombrar nivel' : 'Nuevo nivel de acceso'}
      descripcion={
        original
          ? 'El nombre se ve en el diseño de la hoja y en Roles y permisos. Su clave no cambia.'
          : 'Cada nivel aparece como dos permisos en Roles y permisos: ver y editar, por origen.'
      }
      focoInicial={() => document.getElementById(IDS.nombre)}
      formulario={formulario}
      noDisponible={noDisponible}
      detalleDelConflicto="Lo que escribiste sigue acá."
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear nivel', enCurso: 'Creando…' }
      }
    >
      <Campo
        nombre={IDS.nombre}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_NIVEL + 20}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribir(evento.target.value)
        }}
        error={formulario.errores[CLAVE_DEL_NOMBRE]}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DE_NIVEL)} caracteres. Dos niveles no pueden llamarse igual.`}
      />
    </ModalDeFormulario>
  )
}
