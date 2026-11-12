import { formatearDiaYMes } from '@/shared/lib/fechas'
import { ErrorDeLectura } from '../components/cifra-del-widget'
import { BarrasPorDia } from '../graficas/barras-por-dia'
import { TablaEquivalente } from '../graficas/tabla-equivalente'
import { CREADAS_Y_FINALES } from '../graficas/tipos'
import { VacioDeGrafica } from '../graficas/vacio-de-grafica'
import { leerMetricasDeCotizaciones } from '../lectura'
import type { CuerpoDeWidget } from './tipos'

export const CuerpoDeCotizacionesPorDia: CuerpoDeWidget = async ({ widget, ventana }) => {
  const lectura = await leerMetricasDeCotizaciones(ventana.desde, ventana.hasta)
  if (!lectura.ok) {
    return <ErrorDeLectura error={lectura.error} />
  }
  const dias = lectura.data.por_dia.map((d) => ({ dia: d.dia, a: d.creadas, b: d.finales }))
  if (dias.every((d) => d.a === 0 && d.b === 0)) {
    return <VacioDeGrafica sustantivo="cotizaciones" puedeCrear={false} />
  }
  const [creadas, finales] = CREADAS_Y_FINALES
  return (
    <div className="grid gap-3 p-4">
      <BarrasPorDia titulo={widget.titulo} dias={dias} series={CREADAS_Y_FINALES} />
      <TablaEquivalente
        titulo={widget.titulo}
        primera="Día"
        columnas={[creadas.nombre, finales.nombre]}
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
