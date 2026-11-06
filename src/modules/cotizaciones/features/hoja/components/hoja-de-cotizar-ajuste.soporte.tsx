// La hoja de prueba del ⚙ (4.15-6a): una copia de la forma de `hojaDeAvanzado()` de `hoja-de-cotizar-ayuda.test.tsx`, con `ajustes` en `b1` (principal) y en `x1` (avanzada), y una
// celda principal con secundario que también lo tiene. Sólo para las pruebas (el sufijo `.soporte.` lo deja fuera del mapa).
import { render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import type { RecalculoInicial } from '../../../entities/apertura'
import { hojaDesde, type HojaLista } from '../../../entities/hoja'
import { crudaDeLaHoja, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { Guardado } from '../hooks/use-guardado'
import { ContextoDelAjuste } from './hueco-del-ajuste'
import type { PropsDelAjuste } from './huecos'
import { HojaDeCotizar } from './hoja-de-cotizar'

export const QUIETO: Guardado = {
  estado: { tipo: 'listo' },
  enLinea: true,
  hayPendiente: false,
  ocupado: false,
  guardar: () => {},
  guardarConLaAbierta: () => {},
  olvidarAviso: () => {},
  reiniciar: () => {},
}

const celda = (nodo: string, mas: Record<string, unknown> = {}) => ({
  tipo: 'celda',
  nodo,
  etiqueta: nodo.toUpperCase(),
  tipo_nodo: 'input',
  ajustes: false,
  ancho: 'completo',
  formato: 'usd',
  editable: true,
  ...mas,
})

const PAR = {
  nodo: 'p1',
  como: 'porcentaje',
  tipo_nodo: 'input',
  formato: 'pct',
  ajustes: true,
  editable: true,
}

// Principal, avanzada, principal, avanzada: «Avanzado» va donde estaba la primera, con las dos adentro.
export function hojaConAjustes(): HojaLista {
  const hoja = hojaDesde({
    ...crudaDeLaHoja(),
    secciones: [
      { id: 'a', titulo: 'Subasta', presentacion: 'principal', items: [celda('a1')] },
      {
        id: 'x',
        titulo: 'Componentes CIF',
        presentacion: 'avanzado',
        items: [celda('x1', { ajustes: true }), celda('x2')],
      },
      {
        id: 'b',
        titulo: 'Aduana',
        presentacion: 'principal',
        items: [celda('b1', { ajustes: true }), celda('b2', { secundario: PAR }), celda('b3')],
      },
      { id: 'y', titulo: 'Póliza', presentacion: 'avanzado', items: [celda('y1')] },
    ],
  })
  if (hoja?.estado !== 'lista') {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return hoja
}

export const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({ valores: { a1: 1, x1: 2, x2: 3, b1: 4, b2: 5, b3: 6, y1: 7 } }),
  estado: { tipo: 'al_dia' },
}

// El `Ajuste` de prueba: una región con la etiqueta de su celda y un botón para cerrar.
export const llamadasDeAjuste = vi.fn<(props: PropsDelAjuste) => void>()
export function AjusteDePrueba(props: PropsDelAjuste) {
  llamadasDeAjuste(props)
  return (
    <div role="region" aria-label={`Ajuste de ${props.celda.etiqueta}`}>
      <button type="button" onClick={props.cerrar}>
        Cerrar el ajuste
      </button>
      <button type="button" onClick={() => props.hoja.alConfirmar(props.celda.nodo, 12)}>
        Confirmar 12
      </button>
    </div>
  )
}

export const conProveedor = (hijos: ReactNode) => (
  <ContextoDelAjuste.Provider value={{ Ajuste: AjusteDePrueba }}>
    {hijos}
  </ContextoDelAjuste.Provider>
)

export function montarHoja(busqueda = '', { proveedor = true }: { proveedor?: boolean } = {}) {
  const hoja = (
    <HojaDeCotizar
      hoja={hojaConAjustes()}
      inicial={AL_DIA}
      vehiculoId={null}
      vehiculoSoltado={false}
      leadId={null}
      borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
      guardado={QUIETO}
    />
  )
  return render(
    <NuqsTestingAdapter searchParams={busqueda}>
      {proveedor ? conProveedor(hoja) : hoja}
    </NuqsTestingAdapter>,
  )
}

export const regionesDeAjuste = () => screen.queryAllByRole('region', { name: /^Ajuste de / })
