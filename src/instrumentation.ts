import { entornoPublico } from './shared/config/entorno'
import { entornoDelServidor } from './shared/config/servidor'

// Corre una vez al arrancar el servidor: si falta una variable obligatoria (pública o del servidor), el arranque cae con la lista de lo
// que falta, en vez de fallar más tarde en el primer pedido que la necesite (docs/ENTORNOS.md).
export function register(): void {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return
  entornoPublico()
  entornoDelServidor()
}
