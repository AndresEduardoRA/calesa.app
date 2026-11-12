import Link from 'next/link'
import { textoDeConteo } from '../../../entities/cifras'
import { puede } from '@/shared/lib/permisos'
import { CifraDelWidget, ErrorDeLectura } from '../components/cifra-del-widget'
import { leerMetricasDeLeads } from '../lectura'
import type { CuerpoDeWidget } from './tipos'

export const CuerpoDeLeadsCreados: CuerpoDeWidget = async ({ widget, ventana, permisos }) => {
  const lectura = await leerMetricasDeLeads(ventana.desde, ventana.hasta)
  if (!lectura.ok) {
    return <ErrorDeLectura error={lectura.error} />
  }
  const vacio = lectura.data.creados === 0
  return (
    <CifraDelWidget
      titulo={widget.titulo}
      valor={textoDeConteo(lectura.data.creados)}
      nota={vacio ? 'Todavía no hay leads en este período' : undefined}
      accion={
        vacio && puede(permisos, 'leads.crear') ? (
          <Link
            href="/leads?panel=nuevo-lead"
            className="w-fit text-(length:--text-sm) text-(--color-primario) underline underline-offset-2"
          >
            Nuevo lead
          </Link>
        ) : undefined
      }
    />
  )
}
