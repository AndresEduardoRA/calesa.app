---
paths:
  - 'src/app/**/*.tsx'
  - 'src/modules/**/features/**/*.tsx'
  - 'src/shared/ui/**'
---

# Interfaz

Antes de construir una pantalla, lee su fila en `docs/UX.md` (patrón, roles, estados propios).

## Estados y formularios

- Toda vista de datos resuelve: cargando (esqueleto de `src/shared/ui/esqueletos/` si tarda > 300 ms),
  vacío por primera vez, vacío por filtro, error con reintentar y sin permiso. Usa
  `src/shared/ui/estados/`; no inventes uno por pantalla.
- Filtros, orden, pestaña, vista y registro abierto viven en la URL con `nuqs`
  (`useQueryStates`, `shallow: false`), nunca en estado local ni zustand.
- Si el envío falla, los valores quedan y el foco va al primer error; un formulario de más de 6 campos
  guarda borrador en `sessionStorage` por clave de formulario.
- Envío deshabilitado mientras la acción está en curso (`useAction`); nunca doble envío. Un
  formulario que se reemplaza al llegar lo guardado (`key` con la versión) apaga sus campos mientras guarda.
- Formularios en bloques `<Bloque titulo>` plegables; los secundarios nacen plegados. Su cuerpo es
  una grilla `minmax(0, 1fr)`.

## Destructivas, paneles y modales

- Reversible: hacer + toast con «Deshacer» (sonner). Irreversible: `<Confirmar>` que nombra el objeto.
  Masiva irreversible: confirmación tipeada. Nunca `window.confirm`.
- Todo `<Confirmar>` tiene su URL (`?panel=` con `usePanelPorUrl()`; dentro de un panel, `?eliminar=`),
  se revisa al abrir con `useRevisionAlAbrir()` y se monta una vez por pantalla. Lo vigila
  `scripts/guardas/confirmar-con-url.test.ts`.
- Todo `<Drawer>` avisa de cambios sin guardar con `useCambiosSinGuardar()` (o `<CambiosSinGuardar>`);
  un pie dentro del cuerpo es `<PieDelPanel>` o `<PieConSalida>`. Lo vigila
  `scripts/guardas/drawers-con-salida.ts`.
- Ningún modal abre otro modal: el segundo nivel es `<Drawer>` o página. Un `<Drawer>` o `<Modal>` tiene su URL.
- Un `<Drawer>` que debe deslizarse se monta cerrado y no se vuelve a montar mientras lee; un cuerpo que
  cambia (esqueleto, error, formulario) cambia dentro del mismo drawer.
- Los avisos (`<Toaster>`) no tapan contenido ni el pie de un panel: `useAvisosSobreElPie()`,
  `data-pie-de-panel`. Se comprueba con `avisoNoTapaElPie()` de `e2e/soporte/recorrido.ts`.

## Listas

- Toda lista de registros usa el patrón de `@/shared/ui/lista` (modelos: listado de leads e inventario
  de vehículos): una sola vista elegida en el servidor (`<UnaSolaVista>`: tabla desde 768 px, tarjetas
  debajo), nombre a la izquierda, `<MasAcciones>` a la derecha, tabla con `w-max min-w-full`.
- El clic en la fila abre su resumen (`?lead=`, `?vehiculo=`) salvo casilla, «⋯», enlace o botón propio
  (`esClicPropio` de `src/shared/lib/clic-de-fila.ts`; `data-no-abre`). Con teclado, `<AbrirResumen nombre>`.
  Lo vigila `scripts/guardas/listas-con-patron.ts`.
- Una lista de tarjetas no ensancha la página con el texto al 200 %: `<ul>` con
  `grid-cols-[minmax(0,1fr)]`, `<li>` con `min-w-0`, `flex-wrap` en barras que se parten. Se comprueba
  con `sinScrollHorizontal()` y `aLaVistaSinDesplazar()` de `e2e/soporte/recorrido.ts`.
- Una barra que se desplaza de costado usa `useDesborde()` y `<PistaDeDesborde>`; las pestañas de
  Configuración son `<PestanasConDesborde>`, no `<Tabs>`. El cuerpo de un `<Modal>` que se desplaza usa
  `<PistaVerticalDeDesborde>` y `useDesbordeVertical()`.

## Estilo y texto

- Ningún componente usa `transition-all` (`scripts/guardas/sin-transition-all.test.ts`); un botón o
  pestaña usa `transition`. El cambio de estado de un `<Badge>` es de golpe.
- Con el texto al 200 % nada se sale de su lugar: blancos táctiles de 44 px en px (no `size-11`),
  `<DropdownMenuContent>` con `max-w-(--available-width)`, `<Switch>` con pista y pulgar en rem, la barra
  del celular dibuja lo opcional sólo desde 24 rem (`@container`). Se verifica en e2e con
  `document.documentElement.style.fontSize = '200%'` y, para lo que se juzga mirando, con `E2E_CAPTURAS`.
- Montos, números y fechas con `src/shared/lib/formato.ts`; números a la derecha con `tabular-nums`;
  nunca `toFixed`. Todo monto pasa por `<Monto>` (respeta `useLive()`).
- Estados de entidad con `<Badge>` texto + color, nunca sólo color; los colores de fase y origen vienen de la fila.
- Las acciones visibles salen de `puede(permisos, clave, origenId)` de `@/shared/lib/permisos` y de la
  función de transiciones del flujo; no hay `if (rol === …)` en componentes.
- Fechas cruzan servidor a cliente como string ISO; nunca `Date` en props.
- Textos con los términos de `docs/GLOSARIO.md`, sin exclamaciones ni mayúsculas sostenidas, español
  neutro con tuteo (nunca voseo ni usted); igual para los `raise exception` de la base.
- Transiciones de página con `<Link>` + View Transitions; respeta `prefers-reduced-motion`. Objetivos
  táctiles ≥ 44 px en móvil; densidad desde `useDensidad()`.

## Microdecisiones

- Un texto, un espacio, un icono, el orden de dos botones o el tamaño de un vacío no se preguntan: se
  deciden con `docs/UX.md`, `docs/GLOSARIO.md` y el patrón más parecido que ya exista, y se dicen en
  el informe (o en `docs/carriles/b.md`). Se pregunta sólo lo que cambia un flujo, lo que ve o puede un
  rol, o un dato que se guarda.
