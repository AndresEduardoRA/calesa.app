'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { FilaDeCompra } from '../../../entities/compras/compra'
import type { BorradorDeCompra } from '../../../entities/compras/formulario'
import type { useFormularioDeCompra } from '../hooks/use-formulario-de-compra'
import { CampoDeComprobante } from './campo-de-comprobante'

// Lo que el formulario ofrece para elegir: los ítems vivos de la hoja que ya leyó la página y las monedas activas (D4, D5).
export type ItemParaCompra = { id: string; descripcion: string }
export type MonedaParaCompra = { codigo: string; nombre: string }

type Props = {
  proyectoId: string
  original: FilaDeCompra | null
  items: readonly ItemParaCompra[]
  monedas: readonly MonedaParaCompra[]
  formulario: ReturnType<typeof useFormularioDeCompra>
}

// Un ítem de la compra que ya no está en la hoja se suma con su descripción, para no perderlo al editar (D4).
function opcionesDeItem(items: readonly ItemParaCompra[], original: FilaDeCompra | null) {
  const opciones = [
    { valor: '', etiqueta: 'Sin ítem' },
    ...items.map((i) => ({ valor: i.id, etiqueta: i.descripcion })),
  ]
  if (original?.itemId && !items.some((i) => i.id === original.itemId)) {
    opciones.push({
      valor: original.itemId,
      etiqueta: original.itemDescripcion ?? 'Ítem eliminado',
    })
  }
  return opciones
}

// La moneda de la compra que se edita, aunque ya no esté activa: si no se cambia, no viaja y la base conserva la tasa (D5).
function opcionesDeMoneda(monedas: readonly MonedaParaCompra[], original: FilaDeCompra | null) {
  const opciones = monedas.map((m) => ({ valor: m.codigo, etiqueta: `${m.codigo} · ${m.nombre}` }))
  if (original && !monedas.some((m) => m.codigo === original.moneda)) {
    opciones.push({ valor: original.moneda, etiqueta: original.moneda })
  }
  return opciones
}

type ClaveDeTexto = 'proveedor' | 'monto' | 'fecha' | 'notas'

function CampoDeTexto(p: {
  clave: ClaveDeTexto
  etiqueta: string
  formulario: Props['formulario']
  type?: 'date'
  inputMode?: 'decimal'
}) {
  const f = p.formulario
  return (
    <Campo
      nombre={`compra-${p.clave}`}
      etiqueta={p.etiqueta}
      type={p.type}
      inputMode={p.inputMode}
      autoComplete="off"
      value={f.valores[p.clave]}
      onChange={(evento) => {
        f.escribir({ [p.clave]: evento.target.value } as Partial<BorradorDeCompra>)
      }}
      error={f.errores[p.clave]}
      disabled={f.enCurso}
    />
  )
}

// Los campos de una compra (8.11-3, C12): ítem, proveedor, moneda y monto, fecha, comprobante y notas. Sin tipo de cambio: lo pone la base al guardar.
export function CamposDeCompra({ proyectoId, original, items, monedas, formulario: f }: Props) {
  return (
    <>
      <CampoSeleccion
        nombre="compra-item"
        etiqueta="Ítem"
        opciones={opcionesDeItem(items, original)}
        value={f.valores.itemId}
        onChange={(evento) => {
          f.escribir({ itemId: evento.target.value })
        }}
        error={f.errores['itemId']}
        disabled={f.enCurso}
      />
      <CampoDeTexto clave="proveedor" etiqueta="Proveedor" formulario={f} />
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoSeleccion
          nombre="compra-moneda"
          etiqueta="Moneda"
          opciones={opcionesDeMoneda(monedas, original)}
          value={f.valores.moneda}
          onChange={(evento) => {
            f.escribir({ moneda: evento.target.value })
          }}
          error={f.errores['moneda']}
          disabled={f.enCurso}
        />
        <CampoDeTexto clave="monto" etiqueta="Monto" inputMode="decimal" formulario={f} />
      </div>
      <CampoDeTexto clave="fecha" etiqueta="Fecha" type="date" formulario={f} />
      <CampoDeComprobante
        proyectoId={proyectoId}
        ruta={f.valores.comprobanteRuta}
        alCambiar={(ruta) => {
          f.escribir({ comprobanteRuta: ruta })
        }}
        error={f.errores['comprobanteRuta']}
        deshabilitado={f.enCurso}
      />
      <CampoDeTexto clave="notas" etiqueta="Notas" formulario={f} />
    </>
  )
}
