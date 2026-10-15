// Lo que los e2e de los seguimientos preparan y miran en la base del Supabase LOCAL sin pasar por la
// pantalla: compartir un lead (como lo hará la parte 6), apagar un tipo, meter una fila escrita
// «por fuera» y leer lo que quedó guardado.
import { expect, type Locator, type Page } from '@playwright/test'
import { admin } from './base'
import { exigir } from './leads'
import { irAFicha } from './leads-ficha'

export const SECCION = '?seccion=seguimientos'

export async function irASeguimientos(page: Page, leadId: string): Promise<void> {
  await irAFicha(page, leadId, SECCION)
  await expect(page.getByRole('region', { name: 'Seguimientos' })).toBeVisible()
}

export const redactor = (page: Page): Locator =>
  page.getByRole('form', { name: 'Anotar seguimiento' })
export const edicion = (page: Page): Locator =>
  page.getByRole('form', { name: 'Editar seguimiento' })
export const editorDe = (formulario: Locator): Locator =>
  formulario.getByRole('textbox', { name: 'Detalle (opcional)' })
export const seguimiento = (page: Page, titulo: string): Locator =>
  page.getByRole('article', { name: titulo })

// Abre el redactor con el botón; antes de hidratar el clic no vale, así que se insiste.
export async function abrirRedactor(page: Page): Promise<Locator> {
  const formulario = redactor(page)
  await expect(async () => {
    await page.getByRole('button', { name: 'Anotar seguimiento' }).click()
    await expect(formulario).toBeVisible({ timeout: 1000 })
  }).toPass()
  // El editor llega aparte (carga diferida).
  await expect(editorDe(formulario)).toBeVisible()
  return formulario
}

// Le da el lead a otra persona como co-asesora (lo que hará `compartir_lead` en la parte 6).
export async function compartirCon(leadId: string, personaId: string, deQuienId: string) {
  const { error } = await admin().from('leads_asesores').upsert({
    lead_id: leadId,
    usuario_id: personaId,
    tipo_acceso: 'compartido',
    compartido_por: deQuienId,
    revocado_en: null,
  })
  exigir(error, 'compartir el lead')
}

export type SeguimientoEnLaBase = {
  id: string
  titulo: string
  detalle_doc: unknown
  detalle_texto: string | null
  visibilidad: string
  eliminado_en: string | null
  usuario_id: string
}

export async function seguimientosEnLaBase(leadId: string): Promise<SeguimientoEnLaBase[]> {
  const { data, error } = await admin()
    .from('seguimientos')
    .select('id, titulo, detalle_doc, detalle_texto, visibilidad, eliminado_en, usuario_id')
    .eq('lead_id', leadId)
    .order('ocurrido_en', { ascending: false })
    .returns<SeguimientoEnLaBase[]>()
  exigir(error, 'leer los seguimientos')
  return data ?? []
}

export async function tipoDeSeguimiento(clave: string): Promise<{ id: string; nombre: string }> {
  const { data, error } = await admin()
    .from('tipos_seguimiento')
    .select('id, nombre')
    .eq('clave', clave)
    .single<{ id: string; nombre: string }>()
  exigir(error, `leer el tipo ${clave}`)
  return data ?? { id: '', nombre: '' }
}

// Apaga un tipo y devuelve cómo volver a encenderlo.
export async function apagarTipo(clave: string): Promise<() => Promise<void>> {
  const poner = async (activo: boolean) => {
    const { error } = await admin().from('tipos_seguimiento').update({ activo }).eq('clave', clave)
    exigir(error, `${activo ? 'encender' : 'apagar'} el tipo ${clave}`)
  }
  await poner(false)
  return () => poner(true)
}

// Una fila escrita por fuera de las RPC (como lo haría un bug o el cliente de servicio): un enlace
// `javascript:`, una imagen con `onerror` y HTML en el texto. La pantalla tiene que dibujarla inerte.
export async function meterSeguimientoMalicioso(leadId: string, quienId: string, titulo: string) {
  const tipo = await tipoDeSeguimiento('nota')
  const { error } = await admin()
    .from('seguimientos')
    .insert({
      lead_id: leadId,
      usuario_id: quienId,
      tipo_id: tipo.id,
      titulo,
      visibilidad: 'publico',
      detalle_texto: '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>',
      detalle_doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'clic acá',
                marks: [{ type: 'link', attrs: { href: 'javascript:window.__xss=3' } }],
              },
            ],
          },
          { type: 'image', attrs: { src: 'x', onerror: 'window.__xss=4' } },
        ],
      },
    })
  exigir(error, 'insertar el seguimiento malicioso')
}
