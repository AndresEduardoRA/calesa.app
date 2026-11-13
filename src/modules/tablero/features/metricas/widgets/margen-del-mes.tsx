import {
  TEXTO_SIN_VENTA,
  textoDeSinVenta,
  textoDeVehiculosDelMargen,
} from '../../../entities/cifras'
import { Monto } from '@/shared/ui/monto'
import { CifraDeMonto } from '../components/cifra-de-monto'
import { CifraDelWidget, ErrorDeLectura } from '../components/cifra-del-widget'
import { leerMargenDelMes } from '../lectura'
import type { CuerpoDeWidget } from './tipos'

// El margen del período en moneda base: venta confirmada − costo real de los vehículos de los orígenes donde la persona ve el
// margen. Sin vehículos es «Sin venta registrada», nunca 0. Todo monto por `<Monto>`.
export const CuerpoDeMargenDelMes: CuerpoDeWidget = async ({ widget, ventana }) => {
  const lectura = await leerMargenDelMes(ventana.desde, ventana.hasta)
  if (!lectura.ok) {
    return <ErrorDeLectura error={lectura.error} />
  }
  const { margen, venta, real, cotizado, moneda, vehiculos, sin_venta } = lectura.data
  const sinVenta = textoDeSinVenta(sin_venta)
  if (margen === null || venta === null || real === null) {
    return (
      <CifraDelWidget titulo={widget.titulo} valor={TEXTO_SIN_VENTA} nota={sinVenta ?? undefined} />
    )
  }
  return (
    <CifraDeMonto
      titulo={widget.titulo}
      valor={margen}
      moneda={moneda}
      dato="margen"
      nota={
        <>
          <p>
            Venta <Monto valor={venta} moneda={moneda} /> · Real{' '}
            <Monto valor={real} moneda={moneda} />
            {cotizado === null ? null : (
              <>
                {' '}
                · Cotizado <Monto valor={cotizado} moneda={moneda} />
              </>
            )}
          </p>
          <p>{textoDeVehiculosDelMargen(vehiculos)}</p>
          {sinVenta ? <p>{sinVenta}</p> : null}
        </>
      }
    />
  )
}
