# Marca y voz

Este producto es **white-label**: cada despliegue es una importadora distinta, con su nombre, logo
y color. Nada del repo lleva una marca propia. Lo que sí es fijo es _cómo_ habla y _cómo_ se
comporta la interfaz, y eso vive acá.

## De dónde sale cada cosa

| Pieza                                                                                | Fuente                                                                    | Dónde se aplica                                                                                                                             |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre comercial, NIT/razón social, dirección, teléfono, redes                       | `ajustes_empresa` (Configuración › Empresa)                               | topbar, PDF de cotización, comprobantes, `web.ajustes`                                                                                      |
| Logo (SVG, PNG, WebP o JPEG); la versión para fondo oscuro todavía no tiene interfaz | `ajustes_empresa.logo_ruta`, `logo_oscuro_ruta` (bucket `marca`, público) | sidebar, login, PDF, íconos PWA regenerados                                                                                                 |
| Color primario                                                                       | `ajustes_empresa.color_acento`                                            | `<EstiloDeMarca>`: un `<style>` con `--color-primario` y sus derivados (`-oscuro`, `-soft`, `-ink`, `-sobre-`) de `src/shared/lib/color.ts` |
| Todo lo demás (superficies, texto, semánticos, celdas, viz)                          | `design/tokens.css`                                                       | `src/app/globals.css` → `@theme`                                                                                                            |

Sin marca cargada, la app usa los **defaults neutros** de `tokens.css` (primario `#3b5bdb`) y los
íconos de `public/` (marca neutra: ver `design/ICONOS.md`). No hay ningún estado «sin estilo».

El color de la empresa se acepta sólo si el texto de un botón se lee sobre él con contraste AA
(4,5:1), en blanco o en la tinta oscura; el que mejor dé pasa a ser `--color-sobre-primario`. Los
`-ink` se derivan por tema, oscureciendo o aclarando hasta llegar a AA sobre su superficie. Un
tono intermedio que no se lee con ninguno (un rojo puro) se rechaza con el motivo y un tono
cercano que sí sirve.

El color de **fases, orígenes y etiquetas** lo elige el usuario por fila; `color.ts` deriva el
texto legible y el fondo suave para claro y oscuro. Nunca se mapea un nombre de fase a un color
en el código.

## Voz

- Español neutro, directo, sin signos de exclamación ni mayúsculas sostenidas. «vos» sólo en
  llamados a la acción cortos («Movelo», «Revisá»); el resto en infinitivo o tercera persona.
- Los términos son los del negocio y del glosario: _lead, cartera, fase, mover, cadena, turno,
  vitrina, portal_. Nunca «usuario» en la UI (es «equipo»/«persona»), nunca «status», nunca «item».
- Los mensajes de error dicen **qué falta y qué lo arregla**, en una frase: «Falta el BL aprobado
  para entrar a Embarcado» y no «Operación no permitida».
- Las confirmaciones nombran el objeto: «¿Mandar a la papelera el Toyota RAV4 · lote 41610?».
- Los vacíos proponen la acción que los llena: «Todavía no hay leads. Registrá el primero con N».
- Fechas relativas cuando son recientes («hace 3 min», «ayer 14:30») y absolutas en la zona de la
  empresa cuando importan (vencimientos, subastas).

## Sí / No

| Sí                                                                                                    | No                                                    |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Un color primario, usado con moderación: acciones primarias, foco, enlaces                            | Degradados, sombras de color, dos acentos compitiendo |
| Fondo claro por defecto; modo oscuro completo desde el día uno (clase `.dark`, recordado por usuario) | Modo oscuro «a medias» con cajas blancas              |
| Cifras con `tabular-nums`, alineadas a la derecha, con `<Monto>` (Modo Live)                          | Montos formateados a mano o con `toFixed`             |
| Estado = texto + color (`<Badge>`)                                                                    | Sólo color para decir algo                            |
| Íconos `lucide-react`, 16/20 px, trazo 1.75                                                           | Emojis como íconos, íconos de dos librerías           |
| Esqueletos con la forma real del contenido                                                            | Spinners a pantalla completa                          |
| Transiciones de 120–280 ms que respetan `prefers-reduced-motion`                                      | Animaciones decorativas que frenan la tarea           |

## Tipografía

Geist Sans (UI) y Geist Mono (cifras, celdas, códigos) vía `next/font` — sin licencias que
comprar, sin descargas en runtime. Escala en `tokens.css`; cuerpo en 15 px porque la app se usa
8 horas al día en escritorio y densidad compacta.

## Densidad

Dos densidades conmutables y recordadas por usuario: compacta (filas de 38 px) en escritorio,
cómoda (48 px, objetivos táctiles ≥ 44 px) en celular y por defecto en táctil.
