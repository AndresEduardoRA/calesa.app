'use client'

import { PlusIcon } from 'lucide-react'
import { textoDelTope } from '@/shared/lib/conteo'
import { puede } from '@/shared/lib/permisos'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { TOPE_DE_PAGOS_DE_LA_UNIDAD } from '../../../areas/dinero/composicion.client'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { usePagosDeLaUnidad } from '../hooks/use-pagos-de-la-unidad'
import { usePanelesDePago } from '../hooks/use-paneles-de-pago'
import { usePermisosDeDinero } from '../hooks/use-permisos-de-dinero'
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

// El hueco «Pagos» del panel de la unidad (6.11-2): la lista de sus pagos, «Registrar pago», la corrección y eliminación de los que no están confirmados, «Confirmar pago» con su sello y «Anular
// pago» de los confirmados. Sólo se dibuja con `logistica.pagos.ver` en el origen de la unidad y con la regla `pagos` del flujo activa (lo decide el panel). `logistica.pagos.editar` (del
// origen) enciende «Registrar», «Editar» y «Eliminar»; `logistica.pagos.confirmar` (global), «Confirmar» y «Anular»; la base lo vuelve a exigir.
export function HuecoDePagos({ unidad }: { unidad: Unidad }) {
  const permisos = usePermisosDeDinero()
  const puedeEditar =
    permisos === null ? null : puede(permisos, 'logistica.pagos.editar', unidad.origenId)
  const puedeConfirmar = permisos === null ? null : puede(permisos, 'logistica.pagos.confirmar')
  const { lectura, reintentar } = usePagosDeLaUnidad(unidad.id)
  const pagos = lectura.tipo === 'listo' ? lectura.dato.pagos : null
  const paneles = usePanelesDePago(unidad.id, pagos, { puedeEditar, puedeConfirmar })

  return (
    <div className="grid gap-3" data-hueco="pagos">
      {puedeEditar ? (
        <div>
          <Button
            variant="outline"
            onClick={() => {
              paneles.abrirNuevo()
            }}
          >
            <PlusIcon aria-hidden data-icon="inline-start" />
            Registrar pago
          </Button>
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
        <EstadoVacio compacto titulo="Esta unidad no tiene pagos registrados." />
      ) : null}
      {lectura.tipo === 'listo' && lectura.dato.pagos.length > 0 ? (
        <>
          <ListaDePagos
            pagos={lectura.dato.pagos}
            permisos={{
              puedeEditar: puedeEditar === true,
              puedeConfirmar: puedeConfirmar === true,
            }}
            alEditar={paneles.abrirEdicion}
            alEliminar={paneles.abrirEliminar}
            alConfirmar={paneles.abrirConfirmar}
            alAnular={paneles.abrirAnular}
          />
          {lectura.dato.hayMas ? (
            <AvisoDeTope
              texto={textoDelTope(TOPE_DE_PAGOS_DE_LA_UNIDAD, { sustantivo: 'pagos' })}
            />
          ) : null}
        </>
      ) : null}
      <DialogosDePago unidadId={unidad.id} paneles={paneles} />
    </div>
  )
}
