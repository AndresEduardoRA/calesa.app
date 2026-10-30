'use client'

import type { ReactNode } from 'react'
import { z } from 'zod'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { PestanasDelResumen } from '@/shared/ui/lista'
import { Skeleton } from '@/shared/ui/skeleton'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  MENSAJE_DE_VEHICULO_NO_DISPONIBLE,
  vistaDelResumen,
  type VistaDelResumen,
} from '../../../entities/resumen'
import type { ParaCotizar } from '../../../entities/ruta-para-cotizar'
import type { Vehiculo } from '../../../entities/vehiculo'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import { FichaDeVehiculo } from '../../ficha/components/ficha-de-vehiculo'
import type { DatosDelOrigen } from '../../listado/components/tipos'
import { useResumenDeVehiculo } from '../hooks/use-resumen-de-vehiculo'
import { useVehiculoDelResumen } from '../hooks/use-vehiculo-del-resumen'
import { CabeceraDelResumen } from './cabecera-del-resumen'
import { FotosDelResumenDiferido, InteresadosDelResumenDiferido } from './diferidos'

type Props = DatosDelOrigen & {
  // Las filas de la página: de ahí sale lo que se ve de inmediato, mientras llega la lectura.
  filas: readonly Vehiculo[]
  // Los ids de la página que la persona puede editar. Un vehículo que no está en la página no ofrece «Editar»: está en su ficha.
  editables: ReadonlySet<string>
  // A quién se puede enviar a la papelera y si se puede publicar en este origen: lo que el «⋯» ofrece.
  eliminables: ReadonlySet<string>
  publicar: PermisoDeVitrina
  // «Interesados» existe sólo con `leads.ver`.
  verInteresados: boolean
  // «Cotizar» de la cabecera: la hoja de cotizar de este origen, o null si la persona no cotiza en él.
  paraCotizar: ParaCotizar | null
  // El panel de edición: se dibuja dentro del resumen para que Esc, «Cancelar» y guardar cierren sólo el de arriba y el resumen quede
  // debajo (Base UI anida los diálogos por el árbol de React).
  children?: ReactNode
}

const ES_GUID = z.guid()

function EsqueletoDelResumen({ etiqueta }: { etiqueta: string }) {
  return (
    <div aria-busy="true" aria-label={etiqueta} className="grid gap-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

type PropsDelContenido = DatosDelOrigen & {
  eliminables: ReadonlySet<string>
  publicar: PermisoDeVitrina
  paraCotizar: ParaCotizar | null
  vista: VistaDelResumen
  // Hay un vehículo en la URL (el resumen no se está cerrando).
  abierto: boolean
  ultimo: Vehiculo | null
  editables: ReadonlySet<string>
  reintentar: () => void
  resumen: ReturnType<typeof useResumenDeVehiculo>
}

// El vehículo con su cabecera y sus pestañas. Sólo se dibuja la elegida; «Resumen» es la ficha con los datos que ya trajo la página,
// y las otras dos leen lo suyo al elegirse.
function ConVehiculo(
  props: PropsDelContenido & { vehiculo: Vehiculo; completo: boolean; fallo: boolean },
) {
  const { vehiculo, completo, fallo, reintentar, editables, eliminables, resumen, ...datos } = props
  const { origen, campos, categorias } = datos
  return (
    <div className="grid gap-4">
      <CabeceraDelResumen
        {...datos}
        vehiculo={vehiculo}
        editable={editables.has(vehiculo.id)}
        eliminable={eliminables.has(vehiculo.id)}
        alEnviado={resumen.cerrar}
      />
      <PestanasDelResumen
        etiqueta="Secciones del vehículo"
        pestanas={resumen.pestanas}
        activa={resumen.pestana}
        alElegir={resumen.elegirPestana}
      >
        {resumen.pestana === 'fotos' ? (
          <FotosDelResumenDiferido key={vehiculo.id} vehiculoId={vehiculo.id} />
        ) : resumen.pestana === 'interesados' ? (
          <InteresadosDelResumenDiferido key={vehiculo.id} vehiculoId={vehiculo.id} />
        ) : (
          <div className="grid gap-4">
            {completo ? null : <EsqueletoDelResumen etiqueta="Cargando los datos" />}
            <FichaDeVehiculo
              vehiculo={vehiculo}
              origen={origen}
              campos={campos}
              categorias={categorias}
            />
            {fallo ? (
              <div role="alert" className="flex flex-wrap items-center gap-2">
                <p className="text-(length:--text-sm) text-(--color-ink)">
                  No se pudieron actualizar los datos.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={reintentar}>
                  Reintentar
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </PestanasDelResumen>
    </div>
  )
}

// Lo que va adentro del resumen según cómo esté la lectura.
function ContenidoDelResumen(props: PropsDelContenido) {
  const { vista, abierto, ultimo, reintentar } = props
  if (vista.tipo === 'no_disponible') {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink)">
        {MENSAJE_DE_VEHICULO_NO_DISPONIBLE}
      </p>
    )
  }
  if (vista.tipo === 'error') {
    return (
      <div role="alert" className="grid gap-3">
        <p className="text-(length:--text-sm) text-(--color-ink)">No se pudo cargar el vehículo.</p>
        <Button type="button" variant="outline" onClick={reintentar} className="w-fit">
          Reintentar
        </Button>
      </div>
    )
  }
  // El último que se mostró sólo mientras se cierra: con otro vehículo en la URL se espera el suyo (las pestañas del anterior leerían
  // las fotos de otro).
  const vehiculo = vista.tipo === 'vehiculo' ? vista.vehiculo : abierto ? null : ultimo
  if (vehiculo === null) {
    return <EsqueletoDelResumen etiqueta="Cargando el vehículo" />
  }
  return (
    <ConVehiculo
      {...props}
      vehiculo={vehiculo}
      completo={vista.tipo === 'vehiculo' ? vista.completo : true}
      fallo={vista.tipo === 'vehiculo' && vista.fallo}
    />
  )
}

// El resumen de un vehículo (`?vehiculo=`) sin salir del inventario: arriba su portada, lo que lo identifica y su estado, con «Editar» y
// «Abrir ficha»; debajo, «Resumen», «Fotos» e «Interesados» (`?pestana=`). Se dibuja enseguida con la fila de la página y se completa con
// su lectura (un pedido). Si el vehículo desaparece, o deja de ser visible, mientras está abierto lo dice sin explicar por qué. «Editar»
// abre el panel de edición encima y, al guardar o cancelar, se vuelve a este resumen con el dato al día (la página trae la fila nueva).
export function ResumenDeVehiculo({ filas, editables, verInteresados, children, ...datos }: Props) {
  const resumen = useResumenDeVehiculo({ verInteresados })
  const { id } = resumen
  const idValido = id !== null && ES_GUID.safeParse(id).success
  const { lectura, reintentar } = useVehiculoDelResumen(idValido ? id : null, resumen.editando)
  const vista = vistaDelResumen({
    id,
    idValido,
    lectura,
    delListado: filas.find((fila) => fila.id === id) ?? null,
    origenId: datos.origen.id,
  })
  // Al cerrarse, el resumen tarda un momento en irse: conserva su último vehículo para no vaciarse.
  const ultimo = useUltimo(vista.tipo === 'vehiculo' ? vista.vehiculo : null)
  const mostrado = vista.tipo === 'vehiculo' ? vista.vehiculo : ultimo
  const sinVehiculo = vista.tipo === 'no_disponible'
  return (
    <Drawer
      abierto={id !== null}
      ancho="amplio"
      alCerrar={resumen.cerrar}
      titulo={sinVehiculo ? 'Vehículo no disponible' : (mostrado?.titulo ?? 'Vehículo')}
      descripcion={
        sinVehiculo || mostrado === null
          ? undefined
          : `${datos.origen.nombre} · #${String(mostrado.numero)}`
      }
    >
      <ContenidoDelResumen
        {...datos}
        vista={vista}
        abierto={id !== null}
        ultimo={ultimo}
        editables={editables}
        reintentar={reintentar}
        resumen={resumen}
      />
      {children}
    </Drawer>
  )
}
