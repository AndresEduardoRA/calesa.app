import { leerCotizacionesDelProyecto } from '@/modules/repuestos'
import { CotizacionesDelProyecto } from '@/modules/repuestos/pantallas/cotizador'
import { datosO } from '@/shared/lib/errores'

type Props = {
  proyectoId: string
  // Las monedas activas que ya leyó la página: las opciones de «Nueva cotización», sin otra lectura.
  monedas: readonly { codigo: string; nombre: string }[]
  cerrado: boolean
  puedeConfigurar: boolean
}

// La pestaña «Cotizaciones» (8.12-3, C9): la lista, leída recién al abrirla y sólo si quien mira tiene `repuestos.cotizar` (lo decide la página con
// `pestanasLlenas`). Lo que falla sube al `error.tsx` de la ruta con «Reintentar». Crear revalida la página: la lista se vuelve a leer acá.
export async function SeccionDeCotizaciones({
  proyectoId,
  monedas,
  cerrado,
  puedeConfigurar,
}: Props) {
  const cotizaciones = await leerCotizacionesDelProyecto(proyectoId).then(datosO)
  return (
    <section aria-labelledby="cotizaciones-del-proyecto" className="grid gap-2">
      <h2 id="cotizaciones-del-proyecto" className="text-(length:--text-lg) font-semibold">
        Cotizaciones
      </h2>
      <CotizacionesDelProyecto
        proyectoId={proyectoId}
        filas={cotizaciones.filas}
        hayMas={cotizaciones.hayMas}
        monedas={monedas}
        cerrado={cerrado}
        puedeConfigurar={puedeConfigurar}
      />
    </section>
  )
}
