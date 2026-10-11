# Íconos y favicon

Generados con la marca **neutra** del producto (glifo de tres tramos con flecha sobre el primario
`#3b5bdb`), porque no hay logo: cada despliegue carga el suyo desde Configuración › Empresa.

| Archivo                                          | Uso                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `public/favicon.ico`                             | 16 + 32 + 48 px, lo lee el navegador solo                              |
| `public/apple-touch-icon.png`                    | 180 px, iOS «Agregar a inicio»                                         |
| `public/iconos/icono-{16,32,48,180,192,512}.png` | `manifest.ts` (`icons`) y `<link rel="icon">`                          |
| `public/iconos/icono-512-maskable.png`           | `manifest.ts` con `purpose: 'maskable'` (zona segura 80 %)             |
| `public/iconos/marca.svg`                        | sidebar y login mientras no hay logo; toma `--color-primario` del tema |

## Cuando la empresa carga su logo

La fase 1 agrega a Configuración › Empresa el botón «Regenerar íconos»: toma `logo_ruta`, lo
centra sobre `color_acento` con los mismos tamaños de arriba y los sube al bucket `marca`;
`manifest.ts` lee esas rutas si existen y cae a `public/iconos/` si no. Nunca se editan a mano
los PNG de `public/`.
