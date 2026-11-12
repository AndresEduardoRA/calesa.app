'use client'

import { PlusIcon } from 'lucide-react'
import { puede } from '@/shared/lib/permisos'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { Skeleton } from '@/shared/ui/skeleton'
import { TOPE_DE_GASTOS_DE_LA_UNIDAD } from '../../../areas/dinero/composicion.client'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { textoDelTope } from '@/shared/lib/conteo'
import { useEliminarElGasto } from '../hooks/use-eliminar-el-gasto'
import { useEliminarGastoPorUrl } from '../hooks/use-eliminar-gasto-por-url'
import { useGastosDeLaUnidad } from '../hooks/use-gastos-de-la-unidad'
import { usePanelDeGasto } from '../hooks/use-panel-de-gasto'
import { usePermisosDeDinero } from '../hooks/use-permisos-de-dinero'
import { ConfirmarEliminarGasto } from './confirmar-eliminar-gasto'
import { DrawerDeGasto } from './drawer-de-gasto'
import { ListaDeGastos } from './lista-de-gastos'
import { VerTodosEnGastos } from './ver-todos-en-gastos'

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando los gastos" className="grid gap-2">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  )
}

// El hueco «Gastos» del panel de la unidad (6.11-1): la lista de sus gastos, «Registrar gasto» y la corrección y eliminación de cada uno. Sólo se dibuja con `logistica.gastos.ver` en el origen de
// la unidad y con la regla `gastos` del flujo activa (lo decide el panel); `logistica.gastos.editar` enciende los botones de escribir, y la base lo vuelve a exigir.
export function HuecoDeGastos({ unidad }: { unidad: Unidad }) {
  const permisos = usePermisosDeDinero()
  const puedeEditar =
    permisos === null ? null : puede(permisos, 'logistica.gastos.editar', unidad.origenId)
  const { lectura, reintentar } = useGastosDeLaUnidad(unidad.id)
  const gastos = lectura.tipo === 'listo' ? lectura.dato.gastos : null
  const panel = usePanelDeGasto(gastos, puedeEditar)
  const eliminar = useEliminarGastoPorUrl(gastos, puedeEditar)
  const eliminarElGasto = useEliminarElGasto(unidad.id)

  return (
    <div className="grid gap-3" data-hueco="gastos">
      {puedeEditar ? (
        <div>
          <Button
            variant="outline"
            onClick={() => {
              recordarQuienAbre()
              panel.abrirNuevo()
            }}
          >
            <PlusIcon aria-hidden data-icon="inline-start" />
            Registrar gasto
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
      {lectura.tipo === 'listo' && lectura.dato.gastos.length === 0 ? (
        <EstadoVacio compacto titulo="Esta unidad no tiene gastos registrados." />
      ) : null}
      {lectura.tipo === 'listo' && lectura.dato.gastos.length > 0 ? (
        <>
          <ListaDeGastos
            gastos={lectura.dato.gastos}
            puedeEditar={puedeEditar === true}
            alEditar={(id) => {
              recordarQuienAbre()
              panel.abrirEdicion(id)
            }}
            alEliminar={(id) => {
              recordarQuienAbre()
              eliminar.abrir(id)
            }}
          />
          {lectura.dato.hayMas ? (
            <AvisoDeTope
              texto={textoDelTope(TOPE_DE_GASTOS_DE_LA_UNIDAD, { sustantivo: 'gastos' })}
              camino={<VerTodosEnGastos vista="gastos" origenId={unidad.origenId} />}
            />
          ) : null}
        </>
      ) : null}
      <DrawerDeGasto
        abierto={panel.abierto}
        alCerrar={panel.cerrar}
        unidadId={unidad.id}
        original={panel.nuevo ? null : panel.original}
        apertura={panel.apertura}
      />
      <ConfirmarEliminarGasto
        abierto={eliminar.abierto}
        gasto={eliminar.gasto}
        alCerrar={eliminar.cerrar}
        eliminar={eliminarElGasto}
      />
    </div>
  )
}
