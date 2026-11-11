import { Suspense, type ReactNode } from 'react'
import { MenuDeLogistica } from './menu-de-logistica'

// Logística (6.01): la sub-navegación y, debajo, la pantalla. Cadena, Embarques, Aduana y Gastos se suman a la barra cuando su página existe y la persona la puede ver.
export default function LayoutDeLogistica({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4">
      <Suspense fallback={null}>
        <MenuDeLogistica />
      </Suspense>
      {children}
    </div>
  )
}
