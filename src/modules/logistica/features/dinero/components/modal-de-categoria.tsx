'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Interruptor } from '@/shared/ui/interruptor'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import {
  LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA,
  PROPOSITOS_DE_CATEGORIA,
  SIN_PROPOSITO,
  type CategoriaDeGasto,
} from '../../../entities/dinero/categoria'
import { useFormularioDeCategoria } from '../hooks/use-formulario-de-categoria'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Nulo = «Nueva categoría».
  original: CategoriaDeGasto | null
  // Ya no se puede guardar lo escrito (otra persona eliminó la que se editaba).
  noDisponible: string | null
  alGuardar: () => void
}

const ID_DEL_NOMBRE = 'categoria-de-gasto-nombre'

// «Nueva categoría» y «Editar» de una categoría de gasto (`?panel=nueva-categoria`, `?panel=editar-categoria&categoria=`): nombre, propósito (de la lista fija de la base), orden y si está activa. El propósito
// `tributos` es el que Aduana lee para «tributos pagados»: una categoría que lo tiene no lo cambia. Quien lo monta le da una `key` por apertura: cada una empieza de cero.
export function ModalDeCategoria({ abierto, alCerrar, original, noDisponible, alGuardar }: Props) {
  const f = useFormularioDeCategoria({ original, abierto, alCerrar, alGuardar })
  const esDeTributos = original?.proposito === 'tributos'
  return (
    <ModalDeFormulario
      id="categoria-de-gasto"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar categoría' : 'Nueva categoría'}
      descripcion="Es lo que se elige al registrar un gasto."
      focoInicial={() => document.getElementById(ID_DEL_NOMBRE)}
      formulario={f}
      noDisponible={noDisponible}
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear categoría', enCurso: 'Creando…' }
      }
    >
      <Campo
        nombre={ID_DEL_NOMBRE}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA + 20}
        value={f.valores.nombre}
        onChange={(evento) => {
          f.escribir({ nombre: evento.target.value })
        }}
        error={f.errores['nombre']}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA)} caracteres. Dos categorías no pueden llamarse igual.`}
      />
      <CampoSeleccion
        nombre="categoria-de-gasto-proposito"
        etiqueta="Propósito"
        opciones={[
          { valor: '', etiqueta: SIN_PROPOSITO },
          ...PROPOSITOS_DE_CATEGORIA.map((p) => ({ valor: p.valor, etiqueta: p.nombre })),
        ]}
        value={f.valores.proposito}
        onChange={(evento) => {
          f.escribir({ proposito: evento.target.value })
        }}
        error={f.errores['proposito']}
        ayuda={
          esDeTributos
            ? 'Los tributos los lee Aduana: no cambia.'
            : 'Para qué sirve; «Tributos» alimenta lo que Aduana da por pagado.'
        }
        disabled={esDeTributos}
      />
      <Campo
        nombre="categoria-de-gasto-orden"
        etiqueta="Orden"
        inputMode="numeric"
        autoComplete="off"
        value={f.valores.orden}
        onChange={(evento) => {
          f.escribir({ orden: evento.target.value })
        }}
        error={f.errores['orden']}
        ayuda="Un número entero: las de menor número salen primero."
      />
      <Interruptor
        titulo="Activa"
        ayuda="Una categoría desactivada sigue nombrando los gastos que ya la tienen y no se ofrece en lo nuevo."
        valor={f.valores.activo}
        alCambiar={(activo) => {
          f.escribir({ activo })
        }}
      />
    </ModalDeFormulario>
  )
}
