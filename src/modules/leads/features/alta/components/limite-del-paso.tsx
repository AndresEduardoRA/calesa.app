'use client'

import { Component, type ReactNode } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'

type Props = { children: ReactNode }

// Si el código del paso 2 no llega (sin red y sin caché) el error no tumba el drawer —y con él la
// pantalla—: se dice y lo escrito sigue en el borrador, que vuelve al recargar.
export class LimiteDelPasoDeSeguimiento extends Component<Props, { fallo: boolean }> {
  override state = { fallo: false }

  static getDerivedStateFromError() {
    return { fallo: true }
  }

  override render() {
    if (!this.state.fallo) {
      return this.props.children
    }
    return (
      <Aviso tono="aviso">
        <p>
          No pudimos cargar el seguimiento. Lo que escribiste queda guardado y vuelve al recargar.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 min-h-11 md:min-h-7"
          onClick={() => {
            window.location.reload()
          }}
        >
          Recargar
        </Button>
      </Aviso>
    )
  }
}
