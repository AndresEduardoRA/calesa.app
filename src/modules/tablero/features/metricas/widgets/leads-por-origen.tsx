import { nombreDeOrigen, notaDeTope, TOPE_DE_ORIGENES } from '../../../entities/graficas'
import { puede } from '@/shared/lib/permisos'
import { ErrorDeLectura } from '../components/cifra-del-widget'
import { Ranking } from '../graficas/ranking'
import { TablaEquivalente } from '../graficas/tabla-equivalente'
import { CREADOS_Y_CONVERTIDOS } from '../graficas/tipos'
import { VacioDeGrafica } from '../graficas/vacio-de-grafica'
import { leerMetricasDeLeads } from '../lectura'
import type { CuerpoDeWidget } from './tipos'

export const CuerpoDeLeadsPorOrigen: CuerpoDeWidget = async ({ widget, ventana, permisos }) => {
  const lectura = await leerMetricasDeLeads(ventana.desde, ventana.hasta)
  if (!lectura.ok) {
    return <ErrorDeLectura error={lectura.error} />
  }
  if (lectura.data.por_origen.length === 0) {
    return <VacioDeGrafica sustantivo="leads" puedeCrear={puede(permisos, 'leads.crear')} />
  }
  const filas = lectura.data.por_origen.map((o) => ({
    id: o.origen_lead_id ?? 'sin-origen',
    nombre: nombreDeOrigen(o.nombre),
    a: o.creados,
    b: o.convertidos,
  }))
  const nota = notaDeTope(lectura.data.por_origen_hay_mas, TOPE_DE_ORIGENES, 'origen')
  const [creados, convertidos] = CREADOS_Y_CONVERTIDOS
  return (
    <div className="grid gap-3 p-4">
      <Ranking titulo={widget.titulo} filas={filas} series={CREADOS_Y_CONVERTIDOS} />
      {nota ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{nota}</p> : null}
      <TablaEquivalente
        titulo={widget.titulo}
        primera="Origen"
        columnas={[creados.nombre, convertidos.nombre]}
        filas={filas.map((f) => ({ clave: f.id, etiqueta: f.nombre, a: f.a, b: f.b }))}
      />
    </div>
  )
}
