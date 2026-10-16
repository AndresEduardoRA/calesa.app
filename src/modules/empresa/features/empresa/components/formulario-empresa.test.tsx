import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { valoresDe } from '@/shared/lib/formularios'
import { avisar } from '@/shared/ui/toasts'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import type { Moneda } from '../../../entities/tipos-cambio'
import { CAMPOS_DE_AJUSTES } from '../hooks/use-guardar-ajustes'
import { FormularioEmpresa } from './formulario-empresa'

// Subir el logo y guardar van contra Storage y el servidor: acá sólo se mira el borrador.
vi.mock('../../../composicion.client', () => ({
  prepararLogo: vi.fn(),
  subirLogo: vi.fn(),
  descartarLogo: vi.fn(),
}))
vi.mock('../actions/guardar-ajustes', () => ({ guardarAjustes: vi.fn() }))
vi.mock('@/shared/ui/toasts', () => ({
  avisar: vi.fn(),
  avisarError: vi.fn(),
  avisarExito: vi.fn(),
}))

const BASE: AjustesEmpresa = {
  nombre: 'Importadora Andina',
  razonSocial: null,
  nit: null,
  direccion: null,
  ciudad: null,
  pais: 'Bolivia',
  telefono: null,
  telefonoCc: null,
  whatsapp: null,
  email: null,
  logoRuta: null,
  colorAcento: null,
  iconos: null,
  locale: 'es-BO',
  zonaHoraria: 'America/La_Paz',
  monedaBase: 'USD',
  registroAbierto: false,
  papeleraDias: 30,
  actividadDias: 14,
  limpiezaAutomatica: true,
  limpiezaDiasGracia: 7,
  actualizadoEn: '2026-10-12T14:00:00+00:00',
}

// Todo cargado, con la moneda base que NO es la primera de la lista (el navegador mostraría la
// primera si la opción no estuviera marcada) y con espacios y números que el navegador toca.
const COMPLETOS: AjustesEmpresa = {
  ...BASE,
  razonSocial: 'Andina SRL',
  nit: '1020304050',
  direccion: 'Av. Arce 2345',
  ciudad: 'La Paz',
  telefono: '+591 2 2400000',
  telefonoCc: '+591',
  whatsapp: '+591 70000000',
  email: 'ventas@andina.example',
  colorAcento: '#3b5bdb',
  locale: 'es-BO',
  zonaHoraria: 'America/La_Paz',
  monedaBase: 'BOB',
  papeleraDias: 45,
  actividadDias: 120,
  limpiezaDiasGracia: 21,
}

const MONEDAS: readonly Moneda[] = [
  { codigo: 'USD', nombre: 'Dólar', simbolo: '$', decimales: 2, activa: true, actualizadoEn: 'v' },
  {
    codigo: 'BOB',
    nombre: 'Boliviano',
    simbolo: 'Bs',
    decimales: 2,
    activa: true,
    actualizadoEn: 'v',
  },
]

// Lo que cada campo del formulario tiene que mostrar de lo guardado.
function esperado(ajustes: AjustesEmpresa, conDatosCargados: boolean): Record<string, string> {
  return {
    nombre: ajustes.nombre,
    colorAcento: ajustes.colorAcento ?? '',
    razonSocial: ajustes.razonSocial ?? '',
    nit: ajustes.nit ?? '',
    direccion: ajustes.direccion ?? '',
    ciudad: ajustes.ciudad ?? '',
    telefono: ajustes.telefono ?? '',
    telefonoCc: ajustes.telefonoCc ?? '',
    whatsapp: ajustes.whatsapp ?? '',
    email: ajustes.email ?? '',
    pais: ajustes.pais,
    locale: ajustes.locale,
    zonaHoraria: ajustes.zonaHoraria,
    // Un campo deshabilitado no se envía: el formulario lo lee vacío.
    monedaBase: conDatosCargados ? '' : ajustes.monedaBase,
    papeleraDias: String(ajustes.papeleraDias),
    actividadDias: String(ajustes.actividadDias),
    limpiezaDiasGracia: String(ajustes.limpiezaDiasGracia),
  }
}

const ALMACEN = 'borrador:ajustes-empresa'

beforeEach(() => {
  window.sessionStorage.clear()
  vi.mocked(avisar).mockClear()
})
afterEach(cleanup)

const CASOS = [
  { nombre: 'sin nada cargado', ajustes: BASE, conDatosCargados: false },
  { nombre: 'todo cargado', ajustes: COMPLETOS, conDatosCargados: false },
  {
    nombre: 'con datos cargados (la moneda base, deshabilitada)',
    ajustes: COMPLETOS,
    conDatosCargados: true,
  },
]

describe.each(CASOS)('FormularioEmpresa en una carga limpia: $nombre', (caso) => {
  let formulario: HTMLFormElement

  beforeEach(() => {
    const { container } = render(
      <FormularioEmpresa
        ajustes={caso.ajustes}
        logoUrl={null}
        monedas={MONEDAS}
        zonas={['America/La_Paz']}
        conDatosCargados={caso.conDatosCargados}
        puedeEditar
      />,
    )
    const encontrado = container.querySelector('form')
    if (!encontrado) {
      throw new Error('No hay formulario')
    }
    formulario = encontrado
  })

  it('son los 17 campos de texto del borrador', () => {
    expect(CAMPOS_DE_AJUSTES).toHaveLength(17)
  })

  it.each(CAMPOS_DE_AJUSTES)('«%s» se muestra como se guardó, sin borrador ni aviso', (campo) => {
    expect(formulario.elements.namedItem(campo)).not.toBeNull()
    expect(valoresDe(formulario, [campo])[campo]).toBe(
      esperado(caso.ajustes, caso.conDatosCargados)[campo],
    )
    expect(window.sessionStorage.getItem(ALMACEN)).toBeNull()
    expect(avisar).not.toHaveBeenCalled()
  })
})
