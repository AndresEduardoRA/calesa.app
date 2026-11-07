import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { tarjetaDesde } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { calculoDePrueba, crudaDeLaTarjeta } from '../../../entities/tarjeta/tarjeta.soporte'

type Pedido = { formulaId: string; resolver: (r: Resultado<LecturaDeLaTarjeta>) => void }
const pedidos: Pedido[] = []
vi.mock('../../../areas/tarjeta/composicion.client', () => ({
  leerTarjeta: (formulaId: string) =>
    new Promise<Resultado<LecturaDeLaTarjeta>>((resolver) => {
      pedidos.push({ formulaId, resolver })
    }),
}))

import VistaPreviaDeLaTarjeta, { type DatosDeLaPagina } from './vista-previa-de-la-tarjeta'

const FORMULA = '00000000-0000-4000-8000-0000000000aa'
const lista = (): Resultado<LecturaDeLaTarjeta> => {
  const lectura = tarjetaDesde(crudaDeLaTarjeta())
  if (lectura === null) {
    throw new Error('no se lee')
  }
  return { ok: true, data: lectura }
}
const pagina: DatosDeLaPagina = {
  vehiculo: 'Toyota Hilux 2020',
  asesor: 'Ana Pérez',
  numero: null,
  vencida: false,
  guardadaEl: null,
  logo: null,
  cotizacionId: null,
}

function dibujar(mas: Partial<React.ComponentProps<typeof VistaPreviaDeLaTarjeta>> = {}) {
  return render(
    <VistaPreviaDeLaTarjeta
      abierta
      cerrar={() => undefined}
      formulaId={FORMULA}
      calculo={calculoDePrueba()}
      estado={{ tipo: 'al_dia' }}
      monedaBs="BOB"
      avisos={{ difiere: false, cambiosSinGuardar: false }}
      pagina={pagina}
      {...mas}
    />,
  )
}

beforeEach(() => {
  pedidos.length = 0
})
afterEach(cleanup)

describe('<VistaPreviaDeLaTarjeta>: el modal «Vista previa»', () => {
  it('lee la tarjeta de la versión que dibuja la hoja y mientras llega dice que carga', () => {
    dibujar()
    expect(pedidos.map((p) => p.formulaId)).toEqual([FORMULA])
    expect(screen.getByLabelText('Cargando la tarjeta')).toBeTruthy()
  })

  it('con la lectura, dibuja la tarjeta con el pie de Live', async () => {
    dibujar()
    pedidos[0]?.resolver(lista())
    await waitFor(() => {
      expect(screen.getByText('TOTAL DÓLARES')).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: 'Modo Live: ocultar los montos' })).toBeTruthy()
    expect(screen.getByText('Asesor: Ana Pérez')).toBeTruthy()
  })

  it('un fallo dice «No se pudo leer la tarjeta.» con «Reintentar», que vuelve a leer', async () => {
    dibujar()
    pedidos[0]?.resolver({
      ok: false,
      error: { codigo: 'inesperado', mensaje: 'secreto de la base' },
    })
    await waitFor(() => {
      expect(screen.getByText('No se pudo leer la tarjeta.')).toBeTruthy()
    })
    expect(screen.queryByText('secreto de la base')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    pedidos[1]?.resolver(lista())
    await waitFor(() => {
      expect(screen.getByText('TOTAL DÓLARES')).toBeTruthy()
    })
  })

  it('sin permiso dice que no puedes ver la tarjeta de esta cotización', async () => {
    dibujar()
    pedidos[0]?.resolver({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: 'No tienes acceso' },
    })
    await waitFor(() => {
      expect(screen.getByText('No puedes ver la tarjeta de esta cotización.')).toBeTruthy()
    })
    expect(screen.queryByText('No tienes acceso')).toBeNull()
  })

  it('sin plantilla: la tarjeta por omisión y el aviso fuera de ella', async () => {
    dibujar()
    pedidos[0]?.resolver({ ok: true, data: { estado: 'sin_plantilla' } })
    await waitFor(() => {
      expect(screen.getByText(/no tiene una plantilla de tarjeta para esta versión/)).toBeTruthy()
    })
    expect(document.querySelector('[data-por-omision]')).not.toBeNull()
  })
})

describe('<VistaPreviaDeLaTarjeta>: avisos y fecha', () => {
  it('«Total desactualizado.» sólo con el recálculo atrasado y un total', async () => {
    const { unmount } = dibujar({ estado: { tipo: 'recalculando' } })
    pedidos[0]?.resolver(lista())
    await waitFor(() => {
      expect(screen.getByText('Total desactualizado.')).toBeTruthy()
    })
    unmount()
    dibujar({ estado: null })
    pedidos[1]?.resolver(lista())
    await waitFor(() => {
      expect(screen.getByText('TOTAL DÓLARES')).toBeTruthy()
    })
    expect(screen.queryByText('Total desactualizado.')).toBeNull()
  })

  it('los dos avisos de una guardada van fuera de la tarjeta', async () => {
    dibujar({ avisos: { difiere: true, cambiosSinGuardar: true } })
    pedidos[0]?.resolver(lista())
    await waitFor(() => {
      expect(
        screen.getByText('Lo de hoy no es lo guardado: la tarjeta muestra lo guardado.'),
      ).toBeTruthy()
    })
    expect(
      screen.getByText('Tus cambios sin guardar no están en la tarjeta: guarda para verlos.'),
    ).toBeTruthy()
    const tarjeta = document.querySelector('[data-tarjeta-de-cotizacion]')
    expect(tarjeta?.textContent).not.toContain('Lo de hoy no es lo guardado')
  })

  it('la fecha de una guardada es la de su último guardado, no la de hoy', async () => {
    dibujar({ pagina: { ...pagina, guardadaEl: '2026-10-11T14:00:00.000000+00:00' } })
    pedidos[0]?.resolver(lista())
    await waitFor(() => {
      expect(screen.getByText('11 oct 2026')).toBeTruthy()
    })
  })
})

describe('<VistaPreviaDeLaTarjeta>: el pie', () => {
  it('trae Live y «Copiar texto», que copia la tarjeta que dibuja', async () => {
    const escribir = vi.fn<(texto: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: escribir },
      configurable: true,
    })
    dibujar()
    const copiar = screen.getByRole('button', { name: 'Copiar texto' }) as HTMLButtonElement
    expect(copiar.disabled).toBe(true)
    pedidos[0]?.resolver(lista())
    await waitFor(() => {
      expect(copiar.disabled).toBe(false)
    })
    fireEvent.click(copiar)
    await waitFor(() => {
      expect(escribir).toHaveBeenCalledTimes(1)
    })
    const texto = escribir.mock.calls[0]?.[0] ?? ''
    expect(texto).toContain('Asesor: Ana Pérez')
    expect(texto).toContain('TOTAL DÓLARES: ')
    expect(screen.getByRole('button', { name: 'Modo Live: ocultar los montos' })).toBeTruthy()
    // La hoja nueva no tiene PDF que bajar.
    expect(screen.queryByRole('button', { name: 'Descargar PDF' })).toBeNull()
  })

  it('en una guardada el pie suma «Descargar PDF»', async () => {
    dibujar({
      pagina: { ...pagina, numero: 9, cotizacionId: '00000000-0000-4000-8000-0000000000bb' },
    })
    pedidos[0]?.resolver(lista())
    await waitFor(() => {
      expect(screen.getByText('TOTAL DÓLARES')).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copiar texto' })).toBeTruthy()
  })

  it('con el total desactualizado «Copiar texto» queda apagado y lo nombra el aviso', async () => {
    dibujar({ estado: { tipo: 'recalculando' } })
    pedidos[0]?.resolver(lista())
    const aviso = await screen.findByText('Total desactualizado.')
    const copiar = screen.getByRole('button', { name: 'Copiar texto' })
    expect((copiar as HTMLButtonElement).disabled).toBe(true)
    expect(copiar.getAttribute('aria-describedby')).toBe(aviso.id)
  })
})
