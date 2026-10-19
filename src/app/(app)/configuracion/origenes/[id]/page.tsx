import { ArrowLeftIcon } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { integracionActiva } from '@/modules/empresa'
import { puede, requerirSesion } from '@/modules/equipo'
import { leerOrigenes, pasosDe } from '@/modules/origenes'
import { DatosDelOrigen, SiguientesPasos } from '@/modules/origenes/pantallas/origen'
import { ETIQUETA_DE_TIPO_DE_ORIGEN } from '@/modules/origenes/client'
import { datosO } from '@/shared/lib/errores'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { puedeAbrirOrigenes } from '../acceso'
import { conDestino } from '../pasos'
import { pestanaDe } from '../pestanas'
import { PestanasOrigen } from '../pestanas-origen'
import { SeccionCampos } from './seccion-campos'
import { SeccionCategorias } from './seccion-categorias'

export const metadata: Metadata = { title: 'Origen' }

// Un origen: sus datos, su layout de campos y sus categorías, con lo que le falta para funcionar
// arriba. Lo que no tiene pantalla todavía (el flujo, la fórmula) se dice, sin enlace.
export default async function PaginaOrigen({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]'>) {
  const [sesion, { id }, parametros] = await Promise.all([requerirSesion(), params, searchParams])
  if (!puedeAbrirOrigenes(sesion.permisos)) {
    return <EstadoSinPermiso />
  }
  const origen = datosO(await leerOrigenes()).find((otro) => otro.id === id)
  if (!origen) {
    notFound()
  }
  const puedeGestionar = puede(sesion.permisos, 'origenes.gestionar')
  const pestana = pestanaDe(unParametro(parametros['seccion']))
  const apibaraActiva = origen.tipo === 'subasta' ? await integracionActiva('apibara') : false
  const pasos = conDestino(pasosDe(origen, { apibaraActiva }), sesion.permisos)

  return (
    <div className="grid max-w-3xl gap-4">
      <Link
        href={RUTAS.origenes as Route}
        className="inline-flex w-fit items-center gap-1 text-(length:--text-sm) text-(--color-ink-soft) hover:text-(--color-ink)"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        Orígenes
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden
          className="size-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: origen.color }}
        />
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
          {origen.nombre}
        </h1>
        <Badge variant="secondary">{ETIQUETA_DE_TIPO_DE_ORIGEN[origen.tipo]}</Badge>
        {origen.activo ? null : <Badge variant="outline">Inactivo</Badge>}
      </div>
      <SiguientesPasos nombre={origen.nombre} pasos={pasos} />
      <PestanasOrigen />
      {pestana === 'datos' ? (
        <DatosDelOrigen origen={origen} puedeGestionar={puedeGestionar} />
      ) : null}
      {pestana === 'campos' ? (
        <SeccionCampos origen={origen} puedeGestionar={puedeGestionar} />
      ) : null}
      {pestana === 'categorias' ? (
        <SeccionCategorias origen={origen} puedeGestionar={puedeGestionar} />
      ) : null}
    </div>
  )
}
