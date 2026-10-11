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
