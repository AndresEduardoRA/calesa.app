import { textoDeConteo } from '../../../entities/cifras'
import { CifraDelWidget, ErrorDeLectura } from '../components/cifra-del-widget'
import { leerMetricasDeCotizaciones } from '../lectura'
import type { CuerpoDeWidget } from './tipos'

export const CuerpoDeCotizacionesFinales: CuerpoDeWidget = async ({ widget, ventana }) => {
  const lectura = await leerMetricasDeCotizaciones(ventana.desde, ventana.hasta)
  if (!lectura.ok) {
    return <ErrorDeLectura error={lectura.error} />
  }
  return <CifraDelWidget titulo={widget.titulo} valor={textoDeConteo(lectura.data.finales)} />
}
