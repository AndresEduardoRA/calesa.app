// Corre una vez al arrancar el servidor: si falta una variable obligatoria (pública o del servidor), el arranque cae con la lista de lo
// que falta, en vez de fallar más tarde en el primer pedido que la necesite (docs/ENTORNOS.md).
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return
  const { entornoPublico } = await import('./shared/config/entorno')
  const { entornoDelServidor } = await import('./shared/config/servidor')
  entornoPublico()
  entornoDelServidor()
}
