'use client'

import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import {
  CATALOGOS_DE_REPUESTOS,
  LARGO_MAXIMO_DE_NOMBRE_DE_VALOR,
  type ClaveDeCatalogo,
  type ValorDeCatalogo,
} from '../../../entities/catalogos/catalogo'
import { useFormularioDeValor } from '../hooks/use-formulario-de-valor'

type Props = {
  abierto: boolean
  alCerrar: () => void
  catalogo: ClaveDeCatalogo
  // Nulo = «Agregar».
  original: ValorDeCatalogo | null
  valoresDelCatalogo: readonly ValorDeCatalogo[]
  // Ya no se puede guardar lo escrito (otra persona eliminó el que se editaba).
  noDisponible: string | null
}

const ID_DEL_NOMBRE = 'valor-de-catalogo-nombre'

// «Agregar» y «Editar» de un valor de catálogo (`?panel=nuevo-valor&catalogo=`, `?panel=editar-valor&valor=`): nombre, orden y si está activo. Quien lo monta
// le da una `key` por apertura: cada una empieza de cero.
export function ModalDeValor({
  abierto,
  alCerrar,
  catalogo,
  original,
  valoresDelCatalogo,
  noDisponible,
}: Props) {
  const f = useFormularioDeValor({ catalogo, original, valoresDelCatalogo, abierto, alCerrar })
  const datos =
    CATALOGOS_DE_REPUESTOS.find((c) => c.clave === catalogo) ?? CATALOGOS_DE_REPUESTOS[0]
  return (
    <ModalDeFormulario
      id="valor-de-catalogo"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`${original ? 'Editar' : 'Agregar'} ${datos.nombreDelValor}`}
      descripcion={`Es lo que se elige en «${datos.nombre}» al cargar un ítem.`}
      focoInicial={() => document.getElementById(ID_DEL_NOMBRE)}
      formulario={f}
      noDisponible={noDisponible}
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Agregar', enCurso: 'Agregando…' }
      }
    >
      <Campo
        nombre={ID_DEL_NOMBRE}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_NOMBRE_DE_VALOR + 20}
        value={f.valores.nombre}
        onChange={(evento) => {
          f.escribir({ nombre: evento.target.value })
        }}
        error={f.errores['nombre']}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DE_NOMBRE_DE_VALOR)} caracteres. Dos valores del mismo catálogo no pueden llamarse igual.`}
      />
      <Campo
        nombre="valor-de-catalogo-orden"
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
        ayuda="Uno desactivado sigue nombrando los ítems que ya lo tienen y no se ofrece en lo nuevo."
        valor={f.valores.activo}
        alCambiar={(activo) => {
          f.escribir({ activo })
        }}
      />
    </ModalDeFormulario>
  )
}
