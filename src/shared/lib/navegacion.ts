import type { Route } from 'next'
import { redirect } from 'next/navigation'

// `redirect()` con un destino calculado. Con `typedRoutes`, Next sólo acepta rutas que conoce al
// compilar; un `returnTo`, una ruta con `?aviso=` o la URL de Google no lo son. Quien arma el
// destino es responsable de que sea seguro (`returnToSeguro`, `destinoTrasIngresar`).
// Como `redirect()`, corta la ejecución: nunca dentro de un `try`.
export function redirigir(destino: string): never {
  redirect(destino as Route)
}
