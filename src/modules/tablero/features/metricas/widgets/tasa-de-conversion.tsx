import { textoDeTasa } from '../../../entities/cifras'
import { CifraDelWidget, ErrorDeLectura } from '../components/cifra-del-widget'
import { leerMetricasDeLeads } from '../lectura'
import type { CuerpoDeWidget } from './tipos'

export const CuerpoDeTasaDeConversion: CuerpoDeWidget = async ({ widget, ventana }) => {
  const lectura = await leerMetricasDeLeads(ventana.desde, ventana.hasta)
  if (!lectura.ok) {
    return <ErrorDeLectura error={lectura.error} />
  }
  return (
    <CifraDelWidget
      titulo={widget.titulo}
      valor={textoDeTasa(lectura.data.tasa)}
      nota="Convertidos / creados del período"
    />
  )
}
