import { notaDeTope, TOPE_DE_ORIGENES } from '../../../entities/graficas'
import { ErrorDeLectura } from '../components/cifra-del-widget'
import { Ranking } from '../graficas/ranking'
import { TablaEquivalente } from '../graficas/tabla-equivalente'
import { CREADAS_Y_FINALES } from '../graficas/tipos'
import { VacioDeGrafica } from '../graficas/vacio-de-grafica'
import { leerMetricasDeCotizaciones } from '../lectura'
import type { CuerpoDeWidget } from './tipos'

export const CuerpoDeCotizacionesPorOrigen: CuerpoDeWidget = async ({ widget, ventana }) => {
  const lectura = await leerMetricasDeCotizaciones(ventana.desde, ventana.hasta)
  if (!lectura.ok) {
    return <ErrorDeLectura error={lectura.error} />
  }
  if (lectura.data.por_origen.length === 0) {
    return <VacioDeGrafica sustantivo="cotizaciones" puedeCrear={false} />
  }
  const filas = lectura.data.por_origen.map((o) => ({
    id: o.origen_id,
    nombre: o.nombre,
    a: o.creadas,
    b: o.finales,
  }))
  const nota = notaDeTope(lectura.data.por_origen_hay_mas, TOPE_DE_ORIGENES, 'origen')
  const [creadas, finales] = CREADAS_Y_FINALES
  return (
    <div className="grid gap-3 p-4">
      <Ranking titulo={widget.titulo} filas={filas} series={CREADAS_Y_FINALES} />
      {nota ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{nota}</p> : null}
      <TablaEquivalente
        titulo={widget.titulo}
        primera="Origen"
        columnas={[creadas.nombre, finales.nombre]}
        filas={filas.map((f) => ({ clave: f.id, etiqueta: f.nombre, a: f.a, b: f.b }))}
      />
    </div>
  )
}
