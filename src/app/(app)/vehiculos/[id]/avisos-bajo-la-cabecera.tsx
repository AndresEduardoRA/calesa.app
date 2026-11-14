import { Suspense } from 'react'
import type { Permisos } from '@/modules/equipo'
import type { Vehiculo } from '@/modules/vehiculos'
import { AvisoLimpieza } from './aviso-limpieza'
import { AvisoSituacion } from './aviso-situacion'

type Props = {
  vehiculo: Vehiculo
  origen: { id: string; nombre: string; tipo: string }
  fase: { nombre: string } | null
  permisos: Permisos
  editable: boolean
}

// Los avisos que van bajo la cabecera de la ficha, cada uno tras su `<Suspense>` (leen sesión o base): la limpieza automática (sólo en un origen de
// subasta) y la situación de la subasta (sólo «Sin resolver» o «No ganada»).
export function AvisosBajoLaCabecera({ vehiculo, origen, fase, permisos, editable }: Props) {
  return (
    <>
      {origen.tipo === 'subasta' ? (
        <Suspense fallback={null}>
          <AvisoLimpieza vehiculo={vehiculo} editable={editable} />
        </Suspense>
      ) : null}
      {vehiculo.situacion === 'sin_resolver' || vehiculo.situacion === 'no_ganada' ? (
        <Suspense fallback={null}>
          <AvisoSituacion vehiculo={vehiculo} origen={origen} fase={fase} permisos={permisos} />
        </Suspense>
      ) : null}
    </>
  )
}
