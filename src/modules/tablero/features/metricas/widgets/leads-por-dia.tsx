import { puede } from '@/shared/lib/permisos'
import { ErrorDeLectura } from '../components/cifra-del-widget'
import { BarrasPorDia } from '../graficas/barras-por-dia'
import { TablaEquivalente } from '../graficas/tabla-equivalente'
import { CREADOS_Y_CONVERTIDOS } from '../graficas/tipos'
import { VacioDeGrafica } from '../graficas/vacio-de-grafica'
import { leerMetricasDeLeads } from '../lectura'
import { formatearDiaYMes } from '@/shared/lib/fechas'
import type { CuerpoDeWidget } from './tipos'

export const CuerpoDeLeadsPorDia: CuerpoDeWidget = async ({ widget, ventana, permisos }) => {
  const lectura = await leerMetricasDeLeads(ventana.desde, ventana.hasta)
  if (!lectura.ok) {
    return <ErrorDeLectura error={lectura.error} />
  }
  const dias = lectura.data.por_dia.map((d) => ({ dia: d.dia, a: d.creados, b: d.convertidos }))
  if (dias.every((d) => d.a === 0 && d.b === 0)) {
    return <VacioDeGrafica sustantivo="leads" puedeCrear={puede(permisos, 'leads.crear')} />
  }
  const [creados, convertidos] = CREADOS_Y_CONVERTIDOS
  return (
    <div className="grid gap-3 p-4">
      <BarrasPorDia titulo={widget.titulo} dias={dias} series={CREADOS_Y_CONVERTIDOS} />
      <TablaEquivalente
        titulo={widget.titulo}
        primera="Día"
        columnas={[creados.nombre, convertidos.nombre]}
        filas={dias.map((d) => ({
          clave: d.dia,
          etiqueta: formatearDiaYMes(d.dia),
          a: d.a,
          b: d.b,
        }))}
      />
    </div>
  )
}
