import type { ComponentType } from 'react'

// Una pestaña de Configuración › Sitio web (8.01-3): nula hasta que su paso la llena (`pantallas/sitio-<pestaña>.ts`). `src/app` no dibuja una pestaña nula:
// ni en la barra ni en el hub. El paso que la llena declara las props de su componente (`HuecoDePestana<Props>`) y deja el `| null` del tipo.
export type HuecoDePestana<P = never> = ComponentType<P> | null
