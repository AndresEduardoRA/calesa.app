// Lo que los e2e de los seguimientos preparan y miran en la base del Supabase LOCAL sin pasar por la
// pantalla: compartir un lead (como lo hará la parte 6), apagar un tipo, meter una fila escrita
// «por fuera» y leer lo que quedó guardado.
import { expect, type Locator, type Page } from '@playwright/test'
import { admin } from './base'
import { exigir } from './leads'
import { irAFicha } from './leads-ficha'

export const SECCION = '?seccion=seguimientos'

// `mas`: el resto de la URL (`&panel=…`).
export async function irASeguimientos(page: Page, leadId: string, mas = ''): Promise<void> {
  await irAFicha(page, leadId, `${SECCION}${mas}`)
  await expect(page.getByRole('region', { name: 'Seguimientos' })).toBeVisible()
}

// El modal de anotar o editar (`?panel=anotar-seguimiento`, `?panel=editar-seguimiento&seguimiento=`):
// adentro están los campos y el pie con «Cancelar» y «Guardar».
export const modalDeSeguimiento = (page: Page, modo: 'Anotar' | 'Editar'): Locator =>
  page.getByRole('dialog', { name: `${modo} seguimiento` })
export const editorDe = (formulario: Locator): Locator =>
  formulario.getByRole('textbox', { name: 'Detalle (opcional)' })
// Dentro de la línea de tiempo: un recordatorio puede llevar el mismo título.
export const seguimiento = (page: Page, titulo: string): Locator =>
  page.getByRole('region', { name: 'Seguimientos' }).getByRole('article', { name: titulo })

// Abre el modal con «Anotar seguimiento»; antes de hidratar el clic no vale, así que se insiste. El
// foco queda en el resumen y el editor llega aparte (carga diferida).
export async function abrirAnotar(page: Page): Promise<Locator> {
  const modal = modalDeSeguimiento(page, 'Anotar')
  await expect(async () => {
    if (!page.url().includes('panel=anotar-seguimiento')) {
      await page.getByRole('button', { name: 'Anotar seguimiento' }).click()
    }
    await expect(modal).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect(editorDe(modal)).toBeVisible()
  await expect(modal.getByLabel('Resumen')).toBeFocused()
  return modal
}

// Abre el modal de edición de un seguimiento de la línea de tiempo.
export async function abrirEdicionDeSeguimiento(page: Page, titulo: string): Promise<Locator> {
  const modal = modalDeSeguimiento(page, 'Editar')
  await expect(async () => {
    if (!page.url().includes('panel=editar-seguimiento')) {
      await seguimiento(page, titulo).getByRole('button', { name: 'Editar' }).click()
    }
    await expect(modal).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect(editorDe(modal)).toBeVisible()
  return modal
}

// Le da el lead a otra persona como co-asesora, como lo haría `lead_compartir` (sin pasar por la pantalla).
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

// --- Recordatorios ---------------------------------------------------------------------------------

export const bloqueDeRecordatorios = (page: Page): Locator =>
  page.getByRole('region', { name: 'Tus recordatorios' })
export const recordatorio = (page: Page, titulo: string): Locator =>
  bloqueDeRecordatorios(page).getByRole('article', { name: titulo })

export type RecordatorioEnLaBase = {
  id: string
  titulo: string
  recordar_en: string
  notificado_en: string | null
  completado_en: string | null
  eliminado_en: string | null
  usuario_id: string
  actualizado_en: string
}

export async function recordatoriosEnLaBase(leadId: string): Promise<RecordatorioEnLaBase[]> {
  const { data, error } = await admin()
    .from('recordatorios')
    .select(
      'id, titulo, recordar_en, notificado_en, completado_en, eliminado_en, usuario_id, actualizado_en',
    )
    .eq('lead_id', leadId)
    .order('recordar_en')
    .returns<RecordatorioEnLaBase[]>()
  exigir(error, 'leer los recordatorios')
  return data ?? []
}

// Un recordatorio puesto como dueño de la base (uno vencido no se puede crear por la RPC).
export async function meterRecordatorio(datos: {
  leadId: string
  usuarioId: string
  titulo: string
  recordarEn: string
  notificadoEn?: string
}): Promise<string> {
  const { data, error } = await admin()
    .from('recordatorios')
    .insert({
      lead_id: datos.leadId,
      usuario_id: datos.usuarioId,
      titulo: datos.titulo,
      recordar_en: datos.recordarEn,
      notificado_en: datos.notificadoEn ?? null,
    })
    .select('id')
    .single<{ id: string }>()
  exigir(error, 'insertar el recordatorio')
  return data?.id ?? ''
}

// «Agendar recordatorio» y «Editar» son un modal con su URL (`?panel=agendar-recordatorio`,
// `?panel=editar-recordatorio&recordatorio=<id>`).
export const modalDeRecordatorio = (page: Page, modo: 'Agendar' | 'Editar'): Locator =>
  page.getByRole('dialog', { name: `${modo} recordatorio` })

export async function abrirAgendar(page: Page): Promise<Locator> {
  await bloqueDeRecordatorios(page).getByRole('button', { name: 'Agendar recordatorio' }).click()
  const modal = modalDeRecordatorio(page, 'Agendar')
  await expect(modal.getByLabel('De qué es')).toBeFocused()
  return modal
}

export async function abrirEdicionDeRecordatorio(page: Page, titulo: string): Promise<Locator> {
  await recordatorio(page, titulo).getByRole('button', { name: 'Editar' }).click()
  const modal = modalDeRecordatorio(page, 'Editar')
  await expect(modal.getByLabel('De qué es')).toBeFocused()
  return modal
}
