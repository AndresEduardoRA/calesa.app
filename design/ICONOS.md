# Íconos y favicon

Generados con la marca **neutra** del producto (glifo de tres tramos con flecha sobre el primario
`#3b5bdb`), porque no hay logo: cada despliegue carga el suyo desde Configuración › Empresa.

| Archivo                                          | Uso                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `public/favicon.ico`                             | 16 + 32 + 48 px, lo lee el navegador solo                                      |
| `public/apple-touch-icon.png`                    | 180 px, iOS «Agregar a inicio»                                                 |
| `public/iconos/icono-{16,32,48,180,192,512}.png` | `manifest.ts` (`icons`) y `<link rel="icon">`                                  |
| `public/iconos/icono-512-maskable.png`           | `manifest.ts` con `purpose: 'maskable'` (zona segura 80 %)                     |
| `public/iconos/marca.svg`                        | el glifo neutro; `<Marca>` lo dibuja en línea para que tome `--color-primario` |

## Cuando la empresa carga su logo

Configuración › Empresa tiene «Regenerar íconos». Toma el logo guardado (`logo_ruta`) y dibuja, en
el navegador (Canvas, sin librerías), cinco PNG: 32, 180, 192, 512 y 512 maskable. Los muestra en
vista previa y, recién al confirmar, los sube a `marca/iconos/<hash>.png` y guarda sus rutas en
`ajustes_empresa.iconos`. Si la fila no se guarda, lo subido se descarta; si se guarda, se
descartan los anteriores. «Volver a los neutros» vacía la columna.

- **Fondo:** se elige entre el color de la marca (`color_acento`) y blanco. El logo suele ser del
  color de la marca, y sobre ese mismo color no se vería.
- **Encuadre:** el logo va centrado, sin deformar, en el 68 % del lado; en el maskable, en el 56 %
  (el cuadrado inscrito en la zona segura). 32, 192 y 512 llevan las esquinas redondeadas; el de
  180 (iOS) y el maskable van a sangre, porque el sistema los recorta.
- **Quién los sirve:** `manifest.ts` lee los ajustes y declara las direcciones de Storage (cambian
  en cada regeneración: así el navegador detecta el ícono nuevo); sin íconos propios, las de
  `public/iconos/`. Los `<link rel="icon">` del documento apuntan a `/iconos/vigente/<tamaño>`,
  que redirige al de Storage o al neutro (el layout raíz es estático y no lee los ajustes).
- **Lo que queda neutro:** `favicon.ico` (el bucket no admite `.ico`; los navegadores actuales
  usan el `<link>` en PNG) y, con él, los tamaños 16 y 48, que sólo existen ahí adentro.

Límites que no dependen de la app: en iOS, una PWA ya instalada no cambia de ícono hasta que se
borra y se vuelve a agregar a inicio; en Android, Chrome lo actualiza solo pero con días de demora
y recién al abrir la app; el ícono de una pestaña queda en la caché del navegador.

Nunca se editan a mano los PNG de `public/`.
