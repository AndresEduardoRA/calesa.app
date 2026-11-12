import { getOrigenes } from '@/modules/origenes'
import { leerAjustesDelSitio, leerVehiculosQueDejanDeVerse } from '@/modules/web'
import { FormularioDeAjustesDelSitio } from '@/modules/web/pantallas/sitio-ajustes'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Ajustes» (8.01-4). La compone `src/app`: `web` no importa `origenes`. Si no se pueden leer los ajustes o los orígenes, el
// `error.tsx` con «Reintentar» (nunca valores vacíos que se guardarían encima). El conteo de lo que deja de verse se lee aquí, uno por
// origen que hoy se ve, acotado. La `key` es la versión: lo guardado, aquí o por otra persona, vuelve a montar el formulario desde la base.
export async function SeccionAjustes() {
  const [ajustesLeidos, origenesLeidos] = await Promise.all([leerAjustesDelSitio(), getOrigenes()])
  const ajustes = datosO(ajustesLeidos)
  const origenes = datosO(origenesLeidos).map(({ id, nombre }) => ({ id, nombre }))
  const conteos = await leerVehiculosQueDejanDeVerse(
    origenes.filter((origen) => ajustes.origenesVisibles.includes(origen.id)),
  )
  return (
    <FormularioDeAjustesDelSitio
      key={ajustes.actualizadoEn}
      ajustes={ajustes}
      origenes={origenes}
      conteos={conteos}
    />
  )
}
