'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Campo } from '@/shared/ui/campo'
import { Drawer } from '@/shared/ui/drawer'
import { PieConSalida } from '@/shared/ui/pie-con-salida'
import { useRegional } from '@/shared/ui/regional'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { validarVitrina } from '../../../entities/vitrina'
import type { DeLaFila } from '../../../entities/vitrina-rapida'
import { PANEL_DE_VITRINA_RAPIDA } from '../claves'
import { useVitrinaRapida } from '../hooks/use-vitrina-rapida'

// Lo que falta para publicar desde la lista, y nada más: el precio público. Sin él, la web dice «Consultar» («Publicar sin precio»). Lo demás
// (el «hasta», la nota, destacado, la vista previa) sigue en el panel de la ficha.
function FormularioRapido({ vehiculo, alCerrar }: { vehiculo: DeLaFila; alCerrar: () => void }) {
  const { locale } = useRegional()
  const rapida = useVitrinaRapida()
  const [precio, setPrecio] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  useCambiosSinGuardar(precio.trim() !== '')

  async function publicar(conPrecio: boolean) {
    if (!conPrecio) {
      if (await rapida.cambiar(vehiculo, true, null)) alCerrar()
      return
    }
    const validacion = validarVitrina(
      { publicado: true, precio, precioHasta: '', nota: '', destacado: false },
      locale,
    )
    if (!validacion.ok) {
      setError(validacion.porCampo.precio)
      return
    }
    if (validacion.datos.precio === null) {
      setError('Escribe el precio público, o publica sin precio.')
      return
    }
    if (await rapida.cambiar(vehiculo, true, validacion.datos.precio)) alCerrar()
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void publicar(true)
      }}
    >
      <Campo
        nombre="precio-publico"
        etiqueta="Precio público"
        inputMode="decimal"
        autoComplete="off"
        value={precio}
        error={error}
        ayuda="Lo que verá el visitante. Sin precio, la web dice «Consultar»."
        disabled={rapida.enCurso}
        onChange={(evento) => {
          setPrecio(evento.target.value)
          setError(undefined)
        }}
      />
      <PieConSalida className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap justify-end gap-2 border-t border-(--color-line) bg-(--color-surface) px-4 py-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={rapida.enCurso}
          onClick={() => void publicar(false)}
        >
          Publicar sin precio
        </Button>
        <Button type="submit" className="min-h-11 md:min-h-9" disabled={rapida.enCurso}>
          Publicar
        </Button>
      </PieConSalida>
    </form>
  )
}

// El panel chico de «Publicar en la web» del inventario (`?panel=vitrina-rapida&para=<id>`): sólo para un vehículo de la página que se ve y con
// el permiso; una URL a mano con otro id no abre nada.
export function PanelDeVitrinaRapida({
  filas,
  puede,
}: {
  filas: readonly DeLaFila[]
  puede: boolean
}) {
  const panel = usePanelPorUrl(PANEL_DE_VITRINA_RAPIDA, ['para'])
  const vehiculo = filas.find((fila) => fila.id === panel.valor('para')) ?? null
  return (
    <Drawer
      abierto={panel.abierto && puede && vehiculo !== null && !vehiculo.publicadoWeb}
      alCerrar={panel.cerrar}
      titulo="Publicar en la web"
      descripcion={vehiculo?.titulo}
    >
      {vehiculo ? (
        <FormularioRapido
          key={vehiculo.actualizadoEn}
          vehiculo={vehiculo}
          alCerrar={panel.cerrar}
        />
      ) : null}
    </Drawer>
  )
}
