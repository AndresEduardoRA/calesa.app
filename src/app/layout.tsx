import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import {
  COLOR_FONDO_CLARO,
  COLOR_FONDO_OSCURO,
  DESCRIPCION_APP,
  NOMBRE_POR_DEFECTO,
} from '@/shared/config/app'
import { RegistrarServiceWorker } from '@/shared/ui/registrar-service-worker'
import './globals.css'

// design/tokens.css arma `--font-sans` y `--font-mono` a partir de estas dos variables.
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: NOMBRE_POR_DEFECTO, template: `%s · ${NOMBRE_POR_DEFECTO}` },
  description: DESCRIPCION_APP,
  applicationName: NOMBRE_POR_DEFECTO,
  icons: {
    icon: [
      { url: '/iconos/icono-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
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
    // next-themes pone la clase `.dark` en <html> antes de hidratar: de ahí el suppressHydrationWarning.
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <RegistrarServiceWorker />
      </body>
    </html>
  )
}
