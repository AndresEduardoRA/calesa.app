import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import {
  COLOR_FONDO_CLARO,
  COLOR_FONDO_OSCURO,
  DESCRIPCION_APP,
  NOMBRE_POR_DEFECTO,
} from '@/shared/config/app'
import { ProveedorAtajos } from '@/shared/ui/atajos'
import { GuionLive } from '@/shared/ui/guion-live'
import { RegistrarServiceWorker } from '@/shared/ui/registrar-service-worker'
import { Toaster } from '@/shared/ui/sonner'
import './globals.css'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

// design/tokens.css arma `--font-sans` y `--font-mono` a partir de estas dos variables.
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: NOMBRE_POR_DEFECTO, template: `%s · ${NOMBRE_POR_DEFECTO}` },
  description: DESCRIPCION_APP,
  applicationName: NOMBRE_POR_DEFECTO,
  // Este layout es estático y no lee los ajustes: los íconos apuntan a una dirección fija que
  // redirige al de la empresa o al neutro (`app/iconos/vigente/[tamano]/route.ts`).
  icons: {
    icon: [
      { url: '/iconos/vigente/32', sizes: '32x32', type: 'image/png' },
      { url: '/iconos/vigente/192', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/iconos/vigente/180',
  },
  // Sistema interno: nada de esto se indexa.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: COLOR_FONDO_CLARO },
    { media: '(prefers-color-scheme: dark)', color: COLOR_FONDO_OSCURO },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // next-themes pone la clase `.dark` en <html> antes de hidratar, y <GuionLive> la del Modo
    // Live: de ahí el suppressHydrationWarning.
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <GuionLive />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Filtros, panel abierto y registro elegido viven en la URL (nuqs). */}
          <NuqsAdapter>
            <ProveedorAtajos>{children}</ProveedorAtajos>
          </NuqsAdapter>
          <Toaster position="bottom-right" closeButton />
        </ThemeProvider>
        <RegistrarServiceWorker />
      </body>
    </html>
  )
}
