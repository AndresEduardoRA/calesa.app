'use client'

import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { CajaConfigurada } from '../../../entities/cotizador/filas-de-configuracion'
import { useFormularioDeCaja } from '../hooks/use-formulario-de-caja'

type Props = {
  abierto: boolean
  alCerrar: () => void
  moneda: string
  // Nulo = «Agregar».
  original: CajaConfigurada | null
  noDisponible: string | null
}

const ID_MONTO = 'caja-monto'

// «Agregar caja» y «Editar» una caja (`?panel=caja&caja=<id|nuevo>`, 8.12-2, C9). La moneda no se edita (D24); sin «Eliminar» (D21).
export function ModalDeCaja({ abierto, alCerrar, moneda, original, noDisponible }: Props) {
  const f = useFormularioDeCaja({ moneda, original, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id="caja-del-cotizador"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`${original ? 'Editar' : 'Agregar'} caja en ${moneda}`}
      descripcion="Las cajas son los montos de embalaje que se eligen en cada línea de una cotización."
      focoInicial={() => document.getElementById(ID_MONTO)}
      formulario={f}
      noDisponible={noDisponible}
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Agregar', enCurso: 'Agregando…' }
      }
    >
      <Campo
        nombre={ID_MONTO}
        etiqueta="Monto"
        inputMode="decimal"
        autoComplete="off"
        value={f.valores.monto}
        onChange={(evento) => {
          f.escribir({ monto: evento.target.value })
        }}
        error={f.errores['monto']}
        ayuda="Mayor que cero. Dos cajas de la misma moneda no pueden tener el mismo monto."
      />
      <Interruptor
        titulo="Activa"
        ayuda="Una inactiva no se ofrece en las cotizaciones nuevas."
        valor={f.valores.activa}
        alCambiar={(activa) => {
          f.escribir({ activa })
        }}
      />
    </ModalDeFormulario>
  )
}
