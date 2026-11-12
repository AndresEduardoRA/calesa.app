import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const llamadas = vi.hoisted(() => ({
  subidas: [] as string[],
  registros: [] as { vehiculos: string[]; ruta: string }[],
  cantidad: 2,
}))

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/shared/lib/imagenes', () => ({ hashDe: (f: File) => Promise.resolve(`hash-${f.name}`) }))
vi.mock('../../../areas/documentos/composicion.client', () => ({
  MENSAJE_DE_SUBIDA_FALLIDA: 'No se pudo subir el archivo. Prueba de nuevo.',
  NO_SE_CARGARON_LAS_UNIDADES_DEL_GRUPO: 'No se pudieron cargar las unidades del grupo.',
  leerMisPermisos: () =>
    Promise.resolve(
      ok([{ clave: 'logistica.documentos.subir', alcance: 'todos', origenId: null }]),
    ),
  leerUnidadesDelGrupo: () => {
    const n = llamadas.cantidad
    const unidades = Array.from({ length: Math.min(n, 100) }, (_, i) => ({
      id: id(i + 1),
      origenId: ORIGEN,
    }))
    return Promise.resolve(ok({ unidades, hayMas: n > 100 }))
  },
  leerTiposDeLaUnidad: () => Promise.resolve(ok([tipoBl])),
  subirDocumento: (carpeta: string, _archivo: File, hash: string) => {
    llamadas.subidas.push(`${carpeta}/${hash}`)
    return Promise.resolve(ok(`${carpeta}/${hash}.pdf`))
  },
}))
vi.mock('../actions/registrar-documentos', () => ({
  registrarDocumentos: (pedido: { vehiculos: string[]; ruta: string; id: string }) => {
    llamadas.registros.push({ vehiculos: pedido.vehiculos, ruta: pedido.ruta })
    return Promise.resolve({
      data: {
        ok: true,
        data: pedido.vehiculos.map((v) => ({ id: v, actualizadoEn: '2026-11-12T00:00:00Z' })),
      },
    })
  },
}))

import { HuecoDeDocumentosDelGrupo } from './hueco-de-documentos-del-grupo'

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
const grupo = { tipo: 'embarque', id: 'BKG-1' } as const

beforeEach(() => {
  llamadas.subidas = []
  llamadas.registros = []
  llamadas.cantidad = 2
})
afterEach(cleanup)

describe('HuecoDeDocumentosDelGrupo', () => {
  it('con 2 unidades, un archivo sube un solo objeto y se registra para las dos', async () => {
    render(<HuecoDeDocumentosDelGrupo grupo={grupo} />)
    expect(await screen.findByText('Subir un documento a las 2 unidades')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: tipoBl.id } })
    const entrada = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])')
    if (!entrada) throw new Error('No está el selector de archivos')
    fireEvent.change(entrada, {
      target: { files: [new File(['x'], 'bl.pdf', { type: 'application/pdf' })] },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Subir 1 documento' }))
    await waitFor(() => {
      expect(llamadas.registros).toHaveLength(1)
    })
    expect(llamadas.subidas).toEqual([`${id(1)}/hash-bl.pdf`])
    expect(llamadas.registros[0]).toEqual({
      vehiculos: [id(1), id(2)],
      ruta: `${id(1)}/hash-bl.pdf.pdf`,
    })
  })

  it('con más de 100 unidades no hay zona y dice por qué; no se sube nada', async () => {
    llamadas.cantidad = 101
    render(<HuecoDeDocumentosDelGrupo grupo={grupo} />)
    expect(
      await screen.findByText('Este grupo tiene más de 100 unidades: súbelo por partes.'),
    ).toBeTruthy()
    expect(screen.queryByLabelText('Tipo de documento')).toBeNull()
    expect(llamadas.subidas).toEqual([])
    expect(llamadas.registros).toEqual([])
  })
})
