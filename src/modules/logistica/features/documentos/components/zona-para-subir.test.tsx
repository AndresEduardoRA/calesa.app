import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'
import { destinoDeLaUnidad } from '../../../entities/documentos/destino'
import type { Unidad } from '../../../entities/nucleo/unidad'

const llamadas = vi.hoisted(() => ({ orden: [] as string[], ids: [] as string[] }))
const subida = vi.hoisted(() => ({ falla: false }))
const registro = vi.hoisted(() => ({ falla: true }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/shared/lib/imagenes', () => ({ hashDe: (f: File) => Promise.resolve(`hash-${f.name}`) }))
vi.mock('../../../areas/documentos/composicion.client', () => ({
  MENSAJE_DE_SUBIDA_FALLIDA: 'No se pudo subir el archivo. Prueba de nuevo.',
  subirDocumento: (unidadId: string, f: File, hash: string) => {
    llamadas.orden.push(`subir:${f.name}`)
    return Promise.resolve(
      subida.falla ? fallo('inesperado', 'Sin red') : ok(`${unidadId}/${hash}.pdf`),
    )
  },
}))
// La Server Action trae `server-only` por su composición: aquí es un doble con la forma de `next-safe-action`.
vi.mock('../actions/registrar-documentos', () => ({
  registrarDocumentos: (pedido: { id: string; ruta: string }) => {
    llamadas.orden.push(`registrar:${pedido.ruta}`)
    llamadas.ids.push(pedido.id)
    return Promise.resolve({
      data: registro.falla
        ? { ok: false, error: { codigo: 'regla', mensaje: 'El tipo no admite ese archivo.' } }
        : { ok: true, data: [{ id: pedido.id, actualizadoEn: '2026-11-12T00:00:00Z' }] },
    })
  },
}))

import { ZonaParaSubir } from './zona-para-subir'

const unidad = {
  tipo: 'vehiculo',
  id: '22222222-2222-4222-8222-222222222222',
  origenId: '11111111-1111-4111-8111-111111111111',
} as Unidad

const tipoBl: TipoDeDocumento = {
  id: '33333333-3333-4333-8333-333333333333',
  nombre: 'BL',
  formatos: ['application/pdf'],
  modoDeVencimiento: 'ninguno',
  vigenciaDias: null,
  visiblePortalPermitido: false,
  flujoId: null,
  orden: 1,
}

const pdf = (nombre: string) => new File(['contenido'], nombre, { type: 'application/pdf' })

function entrada(): HTMLInputElement {
  const campo = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])')
  if (!campo) throw new Error('No está el selector de archivos')
  return campo
}

function elegir(archivos: File | File[]) {
  fireEvent.change(entrada(), {
    target: { files: Array.isArray(archivos) ? archivos : [archivos] },
  })
}

beforeEach(() => {
  llamadas.orden = []
  llamadas.ids = []
  subida.falla = false
  registro.falla = true
})
afterEach(cleanup)

describe('ZonaParaSubir: commit diferido', () => {
  it('elegir deja el archivo en la bandeja y no sube nada; lo que el tipo no admite dice por qué', async () => {
    render(
      <ZonaParaSubir
        destino={destinoDeLaUnidad(unidad)}
        titulo="Subir documentos"
        tipos={[tipoBl]}
        puedeSubir
      />,
    )
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: tipoBl.id } })
    elegir([pdf('bl.pdf'), new File(['x'], 'foto.jpg', { type: 'image/jpeg' })])
    expect(await screen.findByText('bl.pdf')).toBeTruthy()
    expect(screen.getByText(/Este tipo de documento no admite JPG\./)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Subir 1 documento' })).toBeTruthy()
    expect(llamadas.orden).toEqual([])
  })

  it('sube el objeto y recién entonces lo registra; al fallar el registro pide reintentar con el mismo id', async () => {
    render(
      <ZonaParaSubir
        destino={destinoDeLaUnidad(unidad)}
        titulo="Subir documentos"
        tipos={[tipoBl]}
        puedeSubir
      />,
    )
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: tipoBl.id } })
    elegir(pdf('bl.pdf'))
    fireEvent.click(await screen.findByRole('button', { name: 'Subir 1 documento' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reintentar los 1 que faltan' })).toBeTruthy()
    })
    expect(llamadas.orden).toEqual([`subir:bl.pdf`, `registrar:${unidad.id}/hash-bl.pdf.pdf`])
    expect(screen.getByText('El tipo no admite ese archivo.')).toBeTruthy()

    registro.falla = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar los 1 que faltan' }))
    await waitFor(() => {
      expect(screen.queryByText('bl.pdf')).toBeNull()
    })
    expect(llamadas.ids).toHaveLength(2)
    expect(llamadas.ids[1]).toBe(llamadas.ids[0])
  })

  it('un archivo que no subió no se registra', async () => {
    subida.falla = true
    render(
      <ZonaParaSubir
        destino={destinoDeLaUnidad(unidad)}
        titulo="Subir documentos"
        tipos={[tipoBl]}
        puedeSubir
      />,
    )
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: tipoBl.id } })
    elegir(pdf('bl.pdf'))
    fireEvent.click(await screen.findByRole('button', { name: 'Subir 1 documento' }))
    expect(await screen.findByText('Sin red')).toBeTruthy()
    expect(llamadas.orden).toEqual(['subir:bl.pdf'])
  })

  it('sin permiso de subir la zona queda apagada y lo dice', () => {
    render(
      <ZonaParaSubir
        destino={destinoDeLaUnidad(unidad)}
        titulo="Subir documentos"
        tipos={[tipoBl]}
        puedeSubir={false}
      />,
    )
    expect(screen.getByText('Necesitas permiso para subir documentos.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Elegir archivos/ }).hasAttribute('disabled')).toBe(
      true,
    )
  })
})
