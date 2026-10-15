// Lo que comparten los e2e de los teléfonos de la ficha: un lead de Berta con el código de país
// guardado (como lo deja el alta) y su ficha abierta, y los números que no se repiten.
import { expect, type Page } from '@playwright/test'
import { entrar } from './alta'
import {
  fijarCodigoDePais,
  irAFicha,
  nuevoLead,
  tituloDeLaFicha,
  type LeadDePrueba,
} from './leads-ficha'
import { telefonoAlAzar } from './leads-alta'
import type { TerrenoDelListado } from './leads-listado'

// Un número nacional que no se repite: la base lo guarda con el código de la empresa.
export const nacional = () => telefonoAlAzar()
export const completoCon = (t: TerrenoDelListado, nac: string) => `${t.codigo}${nac}`

export async function fichaDeBerta(
  t: TerrenoDelListado,
  page: Page,
  corto: string,
): Promise<LeadDePrueba & { nac: string }> {
  const nac = nacional()
  const lead = await nuevoLead({
    corto,
    telefono: completoCon(t, nac),
    deQuien: t.personas.berta,
  })
  await fijarCodigoDePais(lead.id, t.codigo)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  return { ...lead, nac }
}
