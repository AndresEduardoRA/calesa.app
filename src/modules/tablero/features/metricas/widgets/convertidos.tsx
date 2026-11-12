import { formatearFecha } from '@/shared/lib/fechas'
import { textoDeConteo } from '../../../entities/cifras'
import { CifraDelWidget, ErrorDeLectura } from '../components/cifra-del-widget'
import { leerMetricasDeLeads } from '../lectura'
import type { CuerpoDeWidget } from './tipos'

export const CuerpoDeConvertidos: CuerpoDeWidget = async ({ widget, ventana }) => {
  const lectura = await leerMetricasDeLeads(ventana.desde, ventana.hasta)
  if (!lectura.ok) {
    return <ErrorDeLectura error={lectura.error} />
  }
  const { convertidos, conversion_desde: desde, zona } = lectura.data
  // Los clientes de antes de la 9.07 no tienen fecha: si el conteo empieza después del período, se dice.
  const cuentaDesde = desde !== null && desde.slice(0, 10) > ventana.desde ? desde : null
  return (
    <CifraDelWidget
      titulo={widget.titulo}
      valor={textoDeConteo(convertidos)}
      nota={
        cuentaDesde === null ? undefined : `Cuenta desde ${formatearFecha(cuentaDesde, { zona })}`
      }
    />
  )
}
