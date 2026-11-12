'use client'

import { useMemo } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { SimbolosDeXCell } from '@/shared/ui/xcell'
import { TOPE_DE_LINEAS } from '../../../entities/cotizador/formula'
import type { CotizacionLeida, LineaDeLectura } from '../../../entities/cotizador/hoja-de-lectura'
import { itemsDisponibles, type ItemParaCotizar } from '../../../entities/cotizador/hoja-editable'
import type { SnapshotDelCotizador } from '../../../entities/cotizador/snapshot'
import { useHojaDeCotizacion } from '../hooks/use-hoja-de-cotizacion'
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
}

const EN_EL_TOPE = 'Una cotización lleva como mucho 200 líneas.'

// La hoja editable de una cotización de repuestos en borrador (8.12-4, C10–C12). Quien la monta le da `key` = la versión de la cotización: tras guardar,
// la página se relee y la hoja nace de lo guardado (D45). El total en vivo sólo informa; el que vale es el que guarda la base.
export function HojaEditable({ cotizacion, snapshot, lineas: leidas, proyecto, items }: Props) {
  const h = useHojaDeCotizacion({ cotizacion, snapshot, lineas: leidas, proyectoId: proyecto.id })
  const { alConfirmarNumero, alReiniciar, alCambiarTexto, quitar, agregar } = h
  const acciones = useMemo(
    () => ({ alConfirmarNumero, alReiniciar, alCambiarTexto, quitar, agregar }),
    [alConfirmarNumero, alReiniciar, alCambiarTexto, quitar, agregar],
  )
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
    acciones,
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
      <CabeceraDeCotizacion cotizacion={cotizacion} proyecto={proyecto} />
      <ConfiguracionUsada cotizacion={cotizacion} />
      {h.aviso?.codigo === 'conflicto' ? (
        <AvisoDeConflicto mensaje={h.aviso.mensaje} alRecargar={h.recargar} />
      ) : h.aviso ? (
        <Aviso tono="peligro">{h.aviso.mensaje}</Aviso>
      ) : null}
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
