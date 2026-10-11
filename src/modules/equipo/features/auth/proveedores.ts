import 'server-only'
import { connection } from 'next/server'
import { servicioAcceso } from '../../composicion'

// Si Auth tiene encendido el ingreso con Google. La pantalla de ingreso lo pregunta antes de
// dibujar el botón: con el proveedor apagado no hay botón, en vez de un botón que falla.
export async function googleHabilitado(): Promise<boolean> {
  // Es un dato de cada request, no del build: sin esto Next intentaría preguntarlo al prerenderizar.
  await connection()
  return servicioAcceso.googleHabilitado()
}
