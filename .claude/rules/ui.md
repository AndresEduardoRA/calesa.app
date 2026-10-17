---
paths:
  - 'src/app/**/*.tsx'
  - 'src/modules/**/features/**/*.tsx'
  - 'src/shared/ui/**'
---

# Interfaz

Antes de construir una pantalla, lee su fila en `docs/UX.md` (patrón, roles, estados propios).

- Toda vista de datos resuelve: cargando (esqueleto con la forma real si tarda > 300 ms), vacío por
  primera vez, vacío por filtro, error con reintentar, y sin permiso. Usa `src/shared/ui/estados/`;
  no inventes uno por pantalla. Cada patrón tiene su esqueleto en `src/shared/ui/esqueletos/`.
- Filtros, orden, pestaña, vista y registro abierto viven en la URL con `nuqs`
  (`useQueryStates`, `shallow: false`), nunca en estado local ni en zustand.
- Ningún formulario pierde lo tipeado: si el envío falla, los valores quedan y el foco va al primer
  error; los de más de 6 campos guardan borrador en `sessionStorage` por clave de formulario.
- Botones de envío deshabilitados mientras la acción está en curso (`useAction` de next-safe-action).
  Nunca doble envío.
- Destructivas: reversible → hacer + toast con «Deshacer» (sonner); irreversible → `<Confirmar>` que
  nombra el objeto; masiva irreversible → confirmación tipeada. Nunca `window.confirm`.
- **Todo `<Confirmar>` tiene su URL** (`?panel=`, con `usePanelPorUrl()` de `shared/ui`; un diálogo dentro de un panel que ya
  ocupa `?panel=` usa otra clave, `?eliminar=`): se abre y se cierra con su URL, «atrás» lo cierra, la recarga lo reabre, Esc
  devuelve el foco a quien lo abrió, y lo que la URL nombra se revisa una vez al abrir (`useRevisionAlAbrir()`: si no se puede,
  avisa y limpia la URL). Se monta una vez por pantalla, no una por fila, y una clave nueva no puede ser la del tablero ni la
  del filtro (`?etapa=`, `?q=`). `<Confirmar>` no se cierra mientras actúa, ignora el segundo clic y dice sin conexión por sí
  solo; `scripts/guardas/confirmar-con-url.test.ts` falla si aparece uno sin registrar.
- Un formulario que se reemplaza al llegar lo guardado (`key` con la versión) **apaga sus campos** (también los de Base UI, que
  no obedecen al `<fieldset>`) mientras guarda: el aviso sale antes de que se dibuje lo guardado y lo que se tecleara ahí caería
  en un campo que desaparece. `enCurso` de `useAction` dura hasta que se dibuja la respuesta.
- La acción de un aviso que sale de la pantalla («Abrir ficha», `sale: true`) con algo escrito en un panel pregunta en su pie
  (`useCierreConCambios()` y `salida` de `<PieDelPanel>`); cerrar un panel que tiene borrador no pregunta.
- Una tabla ancha lleva un ancho mínimo (`w-max min-w-full`), la columna del nombre pegada a la izquierda (y la de acciones, el «⋯», a la derecha: una acción por fila nunca queda fuera de la vista) y se desplaza dentro de
  su tarjeta: nunca se achica un nombre para que quepan las demás ni se mueve la página de costado.
- Una lista de tarjetas no ensancha la página con el texto al 200 % (reflujo, WCAG 1.4.10): su `<ul>` es `grid-cols-[minmax(0,1fr)]` y su
  `<li>`, `min-w-0` (una columna `auto` toma el ancho mínimo de lo que no se parte y empuja el «⋯» fuera de la vista); el nombre se corta
  con «…», lo de la esquina no se achica (`shrink-0`) y una tarjeta con varias piezas de ancho fijo en rem (miniatura, título, acción) se
  apila con un `@container` (`@max-[16rem]:flex-col`); una barra de botones que se parte (Anterior y Siguiente) lleva `flex-wrap`.
  `sinScrollHorizontal()` de `e2e/soporte/recorrido.ts` lo comprueba y nombra al elemento que se sale.
- Una barra que se desplaza de costado (las secciones de la ficha, las etapas del celular) dice que hay más (`useDesborde()` y
  `<PistaDeDesborde>`: un degradado en el borde por donde sigue) y deja a la vista la sección activa. Su contenedor, si es hijo
  de una grilla, lleva `min-w-0`.
- La barra superior del celular cabe con el texto al 200 %: los blancos táctiles miden 44 px siempre (no `size-11`, que es rem) y
  lo opcional (el tipo de cambio) se dibuja sólo si la barra mide 24 rem o más (`@container`); si no, está en el menú.
- El cambio de estado de un `<Badge>` es de golpe: sólo se anima el anillo de foco (con `transition-all` el texto nuevo se veía
  con el color del viejo). Un componente de terceros hereda la tipografía de la app (el `<Toaster>` la fija en línea: sonner
  inyecta la del sistema).
- El texto al 200 % se verifica con un e2e (`document.documentElement.style.fontSize = '200%'`) y, para lo que se juzga mirando,
  con capturas (`E2E_CAPTURAS`).
- Montos, números y fechas con `src/shared/lib/formato.ts` (Intl, locale y moneda de la empresa).
  Números a la derecha con `tabular-nums`. Nunca `toFixed` ni formateo a mano.
- Modo Live: todo monto pasa por `<Monto>`; ese componente respeta `useLive()` (oculta cifras y
  símbolos). Nunca se imprime un número de dinero sin él.
- Estados de entidad (fase, estado de cotización, documento) con `<Badge>` texto + color; nunca sólo
  color. Los colores de fase/origen vienen de la fila, no de un mapa en código.
- Las acciones visibles salen de `puede(permisos, clave, origenId)` de `@/shared/lib/permisos` y de la
  función de transiciones del flujo; no hay `if (rol === …)` en componentes.
- Ningún modal abre otro modal. Segundo nivel = `<Drawer>` o página. Un `<Drawer>` o `<Modal>` tiene
  su URL (`?panel=`, `?id=`).
- Formularios en bloques: `<Bloque titulo>` plegable; los secundarios nacen plegados.
- Fechas cruzan servidor → cliente como string ISO; nunca `Date` en props de Server → Client.
- Textos de la interfaz con los términos de `docs/GLOSARIO.md`; sin signos de exclamación; sin
  mayúsculas sostenidas; español neutro con tuteo («vuelve a intentar», «no tienes permiso»),
  nunca voseo ni usted. Vale igual para los mensajes de `raise exception` de la base: llegan a la
  pantalla tal cual.
- Transiciones de página con `<Link>` + View Transitions; respetar `prefers-reduced-motion`.
- Objetivos táctiles ≥ 44 px en móvil; densidad desde `useDensidad()`.
