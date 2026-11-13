'use client'

import { PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { TOPE_DE_PAGOS_DE_LA_UNIDAD } from '../../../areas/dinero/composicion.client'
import { usePagosDeLaUnidad } from '../hooks/use-pagos-de-la-unidad'
import { usePanelesDePago } from '../hooks/use-paneles-de-pago'
import { DialogosDePago } from './dialogos-de-pago'
import { ListaDePagos } from './lista-de-pagos'

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando los pagos" className="grid gap-2">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  )
}

type Props = {
  // El vehículo o el proyecto de repuestos (lo dice el ámbito, `AmbitoDePagoContext`).
  unidadId: string
  // Nulo mientras se leen los permisos.
  claves: { puedeEditar: boolean | null; puedeConfirmar: boolean | null }
  // «Registrar pago»: oculto, o visible y apagado con su motivo al lado si `motivo` no es nulo.
  registrar: { visible: boolean; motivo: string | null }
  vacio: string
  etiquetaDeLaLista: string
  // El camino a lo antiguo cuando se llega al tope (nulo: sólo el aviso).
  caminoDelTope: ReactNode
}

// Lo que comparten el hueco «Pagos» del vehículo y la pestaña «Pagos» del proyecto (8.13-5): la lista, «Registrar pago», los estados y los paneles por URL.
export function CuerpoDePagos({
  unidadId,
  claves,
  registrar,
  vacio,
  etiquetaDeLaLista,
  caminoDelTope,
}: Props) {
  const { lectura, reintentar } = usePagosDeLaUnidad(unidadId)
  const pagos = lectura.tipo === 'listo' ? lectura.dato.pagos : null
  const paneles = usePanelesDePago(unidadId, pagos, claves)

  return (
    <div className="grid gap-3" data-hueco="pagos">
      {registrar.visible ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={registrar.motivo !== null}
            onClick={() => {
              paneles.abrirNuevo()
            }}
          >
            <PlusIcon aria-hidden data-icon="inline-start" />
            Registrar pago
          </Button>
          {registrar.motivo !== null ? (
            <p className="text-(length:--text-sm) text-(--color-ink-soft)">{registrar.motivo}</p>
          ) : null}
        </div>
      ) : null}
      {lectura.tipo === 'cargando' ? <Cargando /> : null}
      {lectura.tipo === 'error' ? (
        <div className="grid gap-2">
          <Aviso tono="peligro">
            <p>{lectura.error.mensaje}</p>
          </Aviso>
          <div>
            <Button variant="outline" onClick={reintentar}>
              Reintentar
            </Button>
          </div>
        </div>
      ) : null}
      {lectura.tipo === 'listo' && lectura.dato.pagos.length === 0 ? (
        <EstadoVacio compacto titulo={vacio} />
      ) : null}
      {lectura.tipo === 'listo' && lectura.dato.pagos.length > 0 ? (
        <>
          <ListaDePagos
            pagos={lectura.dato.pagos}
            etiqueta={etiquetaDeLaLista}
            permisos={{
              puedeEditar: claves.puedeEditar === true,
              puedeConfirmar: claves.puedeConfirmar === true,
            }}
            alEditar={paneles.abrirEdicion}
            alEliminar={paneles.abrirEliminar}
            alConfirmar={paneles.abrirConfirmar}
            alAnular={paneles.abrirAnular}
          />
          {lectura.dato.hayMas ? (
            <AvisoDeTope
              texto={textoDelTope(TOPE_DE_PAGOS_DE_LA_UNIDAD, { sustantivo: 'pagos' })}
              camino={caminoDelTope}
            />
          ) : null}
        </>
      ) : null}
      <DialogosDePago unidadId={unidadId} paneles={paneles} />
    </div>
  )
}
