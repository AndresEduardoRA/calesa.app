## 2026-11-08 — Paso 4.23-3

- **Lo no obvio:**
  - **Lo tipeado en una celda es dinero** (una tabla de precios de referencia): sale sólo de `leerNumeroTipeado` con el locale de la empresa (en es-BO
    «9.200,5» es 9200,5 y «1.5» es un aviso). Un año va sin decimales; un texto se recorta (una clave con un espacio al final no casaría en un `match`); una
    columna de otro tipo (sólo por SQL) toma el número si se lee y si no, el texto. Lo que no se lee queda como texto crudo de la celda con su motivo y la fila
    conserva el valor de antes: nunca se publica un número distinto del que se ve escrito (el modal tampoco manda con un crudo, ni si se llega por la URL).
  - **Salir de una celda sin tocarla no cambia nada:** se aplica sólo si el texto difiere del que muestra el campo (`formatearParaEditar`, 15 cifras). Si no, un
    valor guardado con más precisión se redondearía al pasar con Tab y se publicaría. La otra cara (auditoría del informe): un valor de más de 15 cifras significativas (sólo por SQL) se ve redondeado y, si no se toca, se publica
    entero; desde la cifra 16 lo que se ve y lo que se publica difieren. Se acepta: es la precisión del cast de la base.
  - **Las páginas son de lo que está en memoria** (100 filas, el mayor de `TAMANOS_DE_PAGINA`): la tabla se lee entera (4.23-2), así que una de más de 1.000 filas
    llega a todas desde el editor y lo que se publica nunca está recortado. El selector dice «Desde la fila n», sin total, y la página no va a la URL.
  - **El borrador es por versión:** sobre la misma versión se repone; si la tabla se publicó después, se borra y se dice. Mientras se publica se pausa y se borra
    (si entra, el editor se vuelve a montar con la versión nueva y no tiene que encontrar uno viejo); si no entra, se vuelve a guardar.
  - **«Volver a las tablas» no pregunta** (el borrador conserva lo hecho) y **quitar una fila no pregunta** («Deshacer»): nada se escribe hasta publicar.
  - **`tapada` sale del ítem de la lista:** la lectura de una tabla no la sabe. Y una tabla se abre sólo si está en la lista del origen elegido.
  - **Copias en el área `tablas`** (un área no importa otra): el formulario de publicar (`usePublicacionDeTabla`, del de la fórmula, con la celda rechazada) y el
    campo de la nota.
- **Para el coordinador:**
  - **Línea de ESTADO:** «B/C, 4.23-3: las tablas de referencia se editan, reordenan y publican desde Configuración › Cotización; el enlace desde la ayuda, 4.23-4
    del A».
  - **Partición:** el 4.23 pasa a 4 partes. `docs/PLAN.md`, fila del 4.23: «4.23-3: la pestaña «Tablas» de Configuración › Cotización (editar, mover y publicar con
    nota; el editor llega a todas las filas). 4.23-4 (carril A): «Ver la tabla entera» desde la ayuda de una tabla de la hoja.». `docs/plan.yaml`: `4.23-3`
    terminado «Se editan, reordenan y publican desde Configuración › Cotización»; nuevo `4.23-4` (`carril: a`, `depende_de: ['4.23-3']`, riesgo verde, módulos
    `features/hoja/`), terminado «La ayuda de una tabla en su tope lleva a la tabla entera»; el `4.28` pasa a depender del `4.23-4`.
    - **Por qué se parte** (la guarda de carriles no lo impide: B y C editan lo del núcleo): la convención de áreas (B y C no editan los archivos compartidos de
      la hoja), el JS en frío de `/cotizaciones/nuevo` (459,0 de 460 KB, `docs/RENDIMIENTO.md`), que el enlace mueve, y que los e2e de la hoja se verifican aparte.
    - **Pregunta del 4.23-4:** quién ve el enlace. Recomendada: sólo quien tiene `cotizaciones.configurar` en el origen de la hoja (el editor pide esa clave); los
      demás siguen viendo «Mostrando las 1.000 primeras filas.».
  - **4-47:** la primera mitad («una tabla de más de 1.000 filas llega a todas desde el editor») queda cumplida; el enlace desde la ayuda, con el 4.23-4. La segunda
    mitad («una tabla congelada sin viva se rotula con etiquetas») **sigue abierta**: P5 permite la baja por SQL (`activa = false`), `cotizacion_tabla` lee sólo
    las vivas activas, y rotular sin viva exige congelar también las `columnas` (un cambio de base). Va al paso que traiga la baja de tablas o ese cambio.
  - **Choque con el 4.20-4b del A** (la pestaña «Ajustes» en los mismos `pestanas.ts`, `seccion.ts`, `page.tsx` y sus tests): resuelto en el merge `d3ce0c46`
    juntando las dos pestañas en el orden niveles, fórmula, tablas, ajustes. «Ajustes» sigue al final (lo pide su comentario: Niveles primero y Ajustes al
    final) y «Tablas» va junto a «Fórmula», porque sus tablas son parámetros de la fórmula. En la barra, sólo una clave más (`tabla`).
  - **`db:carreras` de la fila no se corrió en esta parte:** no toca `supabase/` ni un candado; las carreras de `tabla_referencia_publicar()` las corrió el 4.23-1.
