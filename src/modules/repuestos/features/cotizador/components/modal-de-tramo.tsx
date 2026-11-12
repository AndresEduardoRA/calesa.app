'use client'

import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { TramoConfigurado } from '../../../entities/cotizador/filas-de-configuracion'
import { useFormularioDeTramo } from '../hooks/use-formulario-de-tramo'

type Props = {
  abierto: boolean
  alCerrar: () => void
  moneda: string
  // Nulo = «Agregar».
  original: TramoConfigurado | null
  noDisponible: string | null
}

const ID_DESDE = 'tramo-desde'

// «Agregar tramo» y «Editar» un tramo de logística (`?panel=tramo&tramo=<id|nuevo>`, 8.12-2, C9). La moneda se muestra y no se edita (D24); sin
// «Eliminar»: un tramo se desactiva (D21). Quien lo monta le da una `key` por apertura.
export function ModalDeTramo({ abierto, alCerrar, moneda, original, noDisponible }: Props) {
  const f = useFormularioDeTramo({ moneda, original, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id="tramo-de-logistica"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`${original ? 'Editar' : 'Agregar'} tramo en ${moneda}`}
      descripcion="Una línea cuyo costo cae en el tramo lleva esta logística sugerida, si no se escribe otra."
      focoInicial={() => document.getElementById(ID_DESDE)}
      formulario={f}
      noDisponible={noDisponible}
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Agregar', enCurso: 'Agregando…' }
      }
    >
      <Campo
        nombre={ID_DESDE}
        etiqueta="Desde"
        inputMode="decimal"
        autoComplete="off"
        value={f.valores.costoMin}
        onChange={(evento) => {
          f.escribir({ costoMin: evento.target.value })
        }}
        error={f.errores['costoMin']}
        ayuda="El costo desde el que vale el tramo (incluido)."
      />
      <Campo
        nombre="tramo-hasta"
        etiqueta="Hasta"
        inputMode="decimal"
        autoComplete="off"
        value={f.valores.costoMax}
        onChange={(evento) => {
          f.escribir({ costoMax: evento.target.value })
        }}
        error={f.errores['costoMax']}
        ayuda="Sin incluir. Vacío: en adelante."
      />
      <Campo
        nombre="tramo-logistica"
        etiqueta="Logística"
        inputMode="decimal"
        autoComplete="off"
        value={f.valores.monto}
        onChange={(evento) => {
          f.escribir({ monto: evento.target.value })
        }}
        error={f.errores['monto']}
        ayuda="El monto por unidad que se sugiere. 0 es logística gratis."
      />
      <Interruptor
        titulo="Activo"
        ayuda="Uno inactivo no se sugiere en las cotizaciones nuevas; las que ya existen guardan el suyo."
        valor={f.valores.activo}
        alCambiar={(activo) => {
          f.escribir({ activo })
        }}
      />
    </ModalDeFormulario>
  )
}
