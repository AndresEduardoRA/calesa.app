'use client'

import { useMemo } from 'react'
import { SimbolosDeXCell } from '@/shared/ui/xcell'
import { TOPE_DE_LINEAS } from '../../../entities/cotizador/formula'
import type { CotizacionLeida, LineaDeLectura } from '../../../entities/cotizador/hoja-de-lectura'
import {
  itemsDisponibles,
  motivoParaNoAceptar,
  type ItemParaCotizar,
} from '../../../entities/cotizador/hoja-editable'
import type { SnapshotDelCotizador } from '../../../entities/cotizador/snapshot'
import { useHojaDeCotizacion } from '../hooks/use-hoja-de-cotizacion'
import { AccionesDeCotizacion } from './acciones-de-cotizacion'
import { AvisoDeLaHoja } from './aviso-de-la-hoja'
import { BloqueEditable } from './bloque-editable'
import { CabeceraDeCotizacion } from './cabecera-de-cotizacion'
import { ConfiguracionUsada } from './configuracion-usada'
import { PieDeLaHoja } from './pie-de-la-hoja'

type Props = {
  cotizacion: CotizacionLeida
  snapshot: SnapshotDelCotizador
  lineas: readonly LineaDeLectura[]
  proyecto: { id: string; numero: number }
  items: readonly ItemParaCotizar[]
  // `repuestos.editar`: aceptar fija el precio de los ítems (D13 de 8.12-1).
  puedeEditarItems: boolean
}

const EN_EL_TOPE = 'Una cotización lleva como mucho 200 líneas.'

// La hoja editable de una cotización de repuestos en borrador (8.12-4, C10–C12). Quien la monta le da `key` = la versión de la cotización: tras guardar,
// la página se relee y la hoja nace de lo guardado (D45). El total en vivo sólo informa; el que vale es el que guarda la base.
export function HojaEditable({
  cotizacion,
  snapshot,
  lineas: leidas,
  proyecto,
  items,
  puedeEditarItems,
}: Props) {
  const h = useHojaDeCotizacion({ cotizacion, snapshot, lineas: leidas, proyectoId: proyecto.id })
  const cajas = useMemo(() => snapshot.cajas.map((c) => c.monto), [snapshot])
  const disponibles = itemsDisponibles(items, h.lineas)
  const bloqueada = h.enCurso ? 'Guardando…' : undefined
  const motivoParaNoAgregar =
    bloqueada ?? (h.lineas.length >= TOPE_DE_LINEAS ? EN_EL_TOPE : undefined)
  const comun = {
    calculadas: h.calculo.lineas,
    moneda: cotizacion.moneda,
    cajas,
    items: disponibles,
    errores: h.errores,
    bloqueada,
    motivoParaNoAgregar,
    acciones: h.acciones,
  }
  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void h.guardar()
      }}
    >
      <SimbolosDeXCell />
      <CabeceraDeCotizacion
        cotizacion={cotizacion}
        proyecto={proyecto}
        acciones={
          <AccionesDeCotizacion
            cotizacion={cotizacion}
            proyectoId={proyecto.id}
            motivoParaNoAceptar={motivoParaNoAceptar({
              puedeEditarItems,
              sinGuardar: h.sinGuardar,
              totalGuardado: cotizacion.total,
            })}
            sinGuardar={h.sinGuardar}
          />
        }
      />
      <ConfiguracionUsada cotizacion={cotizacion} />
      <AvisoDeLaHoja aviso={h.aviso} alRecargar={h.recargar} />
      <BloqueEditable
        bloque="importado"
        titulo="Importado"
        lineas={h.lineas.filter((l) => l.bloque === 'importado')}
        {...comun}
      />
      <BloqueEditable
        bloque="local"
        titulo="Local"
        lineas={h.lineas.filter((l) => l.bloque === 'local')}
        {...comun}
      />
      <PieDeLaHoja
        total={h.calculo.total}
        moneda={cotizacion.moneda}
        notas={h.notas}
        errorDeNotas={h.errores['notas']}
        enCurso={h.enCurso}
        sinGuardar={h.sinGuardar}
        alCambiarNotas={h.setNotas}
      />
    </form>
  )
}
