// Lo que comparten los e2e de los teléfonos extra del panel, el resumen y la configuración: los ajustes de la empresa por SQL y volver a
// lo de fábrica (un solo worker: los demás specs ven 6 y la regla apagada).
import { admin } from './base'
import { exigir } from './leads'

export async function fijarAjustesDeTelefonos(
  maximo: number,
  comoPrincipal: boolean,
): Promise<void> {
  const { error } = await admin()
    .from('ajustes_leads')
    .update({ telefonos_extra_maximo: maximo, telefonos_extra_como_principal: comoPrincipal })
    .eq('id', 1)
  exigir(error, 'fijar los ajustes de teléfonos extra')
}

export const ajustesDeFabricaDeTelefonos = () => fijarAjustesDeTelefonos(6, false)
