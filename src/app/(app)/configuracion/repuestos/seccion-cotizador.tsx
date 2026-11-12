import { leerMonedasYTiposCambio } from '@/modules/empresa'
import { leerConfiguracionDelCotizador } from '@/modules/repuestos'
import { ConfiguracionDelCotizador } from '@/modules/repuestos/pantallas/cotizador-configuracion'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Cotizador» (8.12-2, C10): la fórmula vigente con su historial, los tramos y las cajas, con las monedas activas en su orden. Si una lectura
// falla, `error.tsx` lo dice con «Reintentar».
export async function SeccionCotizador() {
  const [lectura, monedas] = await Promise.all([
    leerConfiguracionDelCotizador().then(datosO),
    leerMonedasYTiposCambio().then(datosO),
  ])
  return (
    <ConfiguracionDelCotizador
      lectura={lectura}
      monedasActivas={monedas.monedas.filter((m) => m.activa).map((m) => m.codigo)}
    />
  )
}
