## 2026-11-12 · Decisiones del paso 9.08-2 (las gráficas del tablero)

- **D15 · Gráficas en HTML y SVG, sin librería.** El texto (ejes, nombres, números) es HTML; el SVG sólo pinta barras con `viewBox` y `preserveAspectRatio="none"`: ocupa el ancho de la tarjeta, ningún texto se deforma y en el celular no desborda. Alto fijo (`h-40`) para que no salte al cargar.
- **D16 · Cinco widgets anchos** con `tablero.metricas.ver` y el grupo de su RPC, después de las cifras y antes de los huecos del 9.11 (el orden del catálogo es el de la pantalla).
- **D17 · El contenedor de una gráfica es `role="img"`, no `group`,** y ningún título empieza como una cifra: así `getByRole('group', { name: /^Cotizaciones: / })` sigue encontrando una sola.
- **D18 · «Ver como tabla» es un `<details>` nativo** (Server Component, sin JS), cerrado por defecto, con todos los números en un contenedor de alto máximo.
- **D19 · Dos series por gráfica, siempre con leyenda en texto** (cuadrito de color y nombre); cada barra lleva su `<title>` y los números están en la tabla.
- **D20 · El ranking respeta el orden de la RPC** (creados de mayor a menor); las barras son proporcionales al máximo de la lista y los números van escritos. Origen nulo: «Sin origen»; persona sin nombre: «Sin nombre».
- **D21 · Topes con frase, nunca un total:** «Se muestran los 10 primeros orígenes.» y «Se muestran las 20 primeras personas.» sólo si la RPC dice que hay más; los 10 y 20 son constantes con la migración de 9.07 citada.
- **D22 · Vacío = sin movimiento en todo el período:** «Todavía no hay leads / cotizaciones en este período»; «Nuevo lead» sólo en leads y sólo con `leads.crear`.
- **D23 · Un solo e2e de camino feliz (T5), sembrando su propio lead** para no depender de otros specs; sin capturas, volumen ni e2e de vacío. Lo clave con vitest: la escala y los textos.
- **D24 · La tabla equivalente figura en `listas-con-patron.ts` con su motivo** (una tabla de sólo lectura de una gráfica, no una lista de registros): la guarda lo exigió al sumar `<Table>`.
- **D25 · Tipo de esta parte: pantalla** sobre las RPC de 9.07, sin SQL ni permisos nuevos.
