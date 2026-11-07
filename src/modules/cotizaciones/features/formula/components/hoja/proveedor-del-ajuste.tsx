import type { PropsDelProveedor } from '../../../hoja/components/huecos'
import { ProveedorDelAjusteCliente } from './proveedor-del-ajuste-cliente'

// El `Proveedor` del hueco de la hoja (4.20-3b), de servidor: la página le da sus props y él pasa al navegador sólo el origen. Los permisos no viajan: quién ve el ⚙ lo dice
// la base por celda (`ajustes`), y la escritura vuelve a mirarlos en la action y en `formula_cambiar_constante()`.
export function ProveedorDelAjuste({ children, origenId }: PropsDelProveedor) {
  return <ProveedorDelAjusteCliente origenId={origenId}>{children}</ProveedorDelAjusteCliente>
}
