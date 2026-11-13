import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { z } from 'zod'
import { puede, requerirSesion } from '@/modules/equipo'
import { RUTA_DE_LA_LISTA_DE_GUIAS, leerGuia, leerOpcionesDeGuia } from '@/modules/web'
import { FormularioDeGuia } from '@/modules/web/pantallas/guia'
import { datosO } from '@/shared/lib/errores'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'

export const metadata: Metadata = { title: 'Guía' }

const VOLVER = RUTA_DE_LA_LISTA_DE_GUIAS as Route

// Una guía del sitio (`web.contenido.gestionar`): su formulario con el editor. La que no existe (o cuyo id no es uno) se dice con un enlace a la lista.
export default function PaginaDeUnaGuia({ params }: PageProps<'/configuracion/web/guias/[id]'>) {
  return (
    <>
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso (9.12-5, R3). Sin cabecera visible: el formulario abre con su enlace «← Guías». */}
      <h1 className="sr-only">Editar guía</h1>
      <Suspense fallback={<EsqueletoFormulario bloques={3} campos={4} />}>
        <Guia params={params} />
      </Suspense>
    </>
  )
}

function NoDisponible() {
  return (
    <EstadoVacio
      titulo="Esta guía ya no existe."
      accion={
        <Link href={VOLVER} className={buttonVariants({ variant: 'outline' })}>
          Volver a Guías
        </Link>
      }
    />
  )
}

async function Guia({ params }: { params: PageProps<'/configuracion/web/guias/[id]'>['params'] }) {
  await connection()
  const [sesion, { id }] = await Promise.all([requerirSesion(), params])
  if (!puede(sesion.permisos, 'web.contenido.gestionar')) {
    return <EstadoSinPermiso />
  }
  const guia = z.guid().safeParse(id).success ? datosO(await leerGuia(id)) : null
  if (guia === null) {
    return <NoDisponible />
  }
  // Las lecturas que fallan suben al `error.tsx` (con «Reintentar»): nunca un formulario con selectores vacíos que se guardaría encima.
  const opciones = datosO(
    await leerOpcionesDeGuia({ categoriaId: guia.categoriaId, autorId: guia.autorId }),
  )
  return (
    <div className="grid max-w-3xl gap-4">
      <Link
        href={VOLVER}
        className="w-fit text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:underline"
      >
        ← Guías
      </Link>
      <FormularioDeGuia
        key={guia.actualizadoEn}
        guia={guia}
        opciones={opciones}
        ahora={new Date().toISOString()}
        puedePublicarGuias={puede(sesion.permisos, 'web.guias.publicar')}
      />
    </div>
  )
}
