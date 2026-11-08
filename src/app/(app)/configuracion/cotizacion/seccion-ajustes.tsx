import { leerAjustesDeCotizacion } from '@/modules/empresa'
import { FormularioDeAjustesDeCotizacion } from '@/modules/empresa/pantallas/configuracion-cotizacion'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Ajustes»: la vigencia y el vehículo obligatorio al cotizar, una fila que siempre existe. Si no se puede leer, el `error.tsx` con «Reintentar»
// (nunca los de fábrica). La `key` es la versión: lo guardado, aquí o por otra persona, vuelve a montar el formulario desde la base. `puedeCambiar` lo pone la página.
export async function SeccionAjustes({ puedeCambiar }: { puedeCambiar: boolean }) {
  const ajustes = datosO(await leerAjustesDeCotizacion())
  return (
    <FormularioDeAjustesDeCotizacion
      key={ajustes.actualizadoEn}
      ajustes={ajustes}
      puedeCambiar={puedeCambiar}
    />
  )
}
