## 2026-11-08 — Paso 4.19-4

- **El hueco es un tipo del núcleo con una lectura plana, no un contexto:** `plantilla` no puede importar `tarjeta` (ni su tipo), así que `entities/vista-previa-de-la-plantilla.ts` lleva la
  lectura (sin `Map`, porque cruza props de la página al editor) y `tarjeta` la vuelve `TarjetaLista` con un adaptador puro. La página de `src/app` pasa el componente por la sección,
  la pestaña y el editor. Va en `pantallas/tarjeta-plantilla.ts` y no en `tarjeta.ts`, para no sumar al JS de `/cotizaciones/nuevo` (4-73).
- **Lugar:** al costado desde `xl` (columna `minmax(0, 24rem)`, pegada arriba); debajo, tras el cuerpo del editor y antes de «Guardar». La página se ensancha a `max-w-6xl` sólo en «Tarjeta».
  La columna no es de `24rem` fijos: con el texto al 200 % (`html { font-size: 200% }`) los media queries siguen en 1280 px y una columna fija ensanchaba la página.
- **Tipo de cambio y leyenda:** el tipo de cambio es la etiqueta del nodo del bucket, no el nombre de `tipos_cambio`; la leyenda es sólo la escrita (**4-103**: lo demás no viaja al navegador).
- **Cifras de ejemplo (P6), deterministas:** la fila n-ésima vale `(n mod 8 + 1) × 250` USD, lo aparte `100 × (posición + 1)` y el total es la suma de las filas dibujadas. Pasan por `<Monto>`:
  con el Modo Live encendido se ocultan, como en cualquier pantalla.
- **Tope de 4 filas por grupo** (`FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA`): con 500 miembros en un grupo la vista previa suma ≈ 150 nodos; el aviso lo dice.
- **Página de ejemplo sin `Date`** (desajustaría la hidratación): textos fijos y la marca sin logo, para que el interruptor «Logo» se note.
- **Un tono sin colores válidos se ve neutro:** `<EstiloDeTonos>` lo descarta entero. `claro` y `oscuro` son opcionales en `TonoDelCatalogo` para no tocar cada fixture; la lectura de la base siempre los trae.
- **E1 corre también en móvil** por precedente de los cinco specs de la pestaña (la regla de «sin `movil` en Configuración» no se estrenó para esta pestaña).
- **Sólo `diferidos.tsx` puede declarar una diferida** (guarda `diferidos.test.ts`): la de la vista previa va en el de `tarjeta`, con un `div` de esqueleto y no `<Skeleton>`, para no sumar un import al archivo que viaja con la hoja.
