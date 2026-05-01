## PARTE 1: Cómo subir el proyecto a Internet (Vercel)

Esta opción es la más rápida para que el sitio esté "vivo" en una dirección web (ej. `infracoop.vercel.app`).

1. **Entrar a Vercel:** Ve a [vercel.com](https://vercel.com) e inicia sesión. Elige la opción de entrar con **GitHub**.
2. **Importar el proyecto:**
   * Haz clic en el botón azul **"Add New..."** y luego en **"Project"**.
   * Verás una lista de carpetas. Busca la que dice **`DaVas1410/infracoop`** y haz clic en el botón **"Import"**.
3. **Configurar las "Llaves" (Variables de Entorno):**
   * Antes de finalizar, verás un apartado llamado **"Environment Variables"**. Haz clic en la flechita para abrirlo.
   * Verás dos cuadros: uno dice **"Key"** y otro **"Value"**.
   * Debes copiar y pegar los nombres y valores que te enviamos por separado. Haz clic en **"Add"** por cada uno que agregues.
4. **Base de Datos (Supabase):** No te preocupes por esto, **el proyecto de Supabase ya está configurado y activo dentro de tu organización**. Todo está conectado internamente.
5. **Lanzar:** Haz clic en el botón **"Deploy"**. Espera a que cargue y ¡listo! Ya tienes el sitio en internet.

---

## PARTE 2: Cómo instalar y abrir el proyecto en tu computadora

Si quieres ver el proyecto en tu PC sin necesidad de internet, necesitamos preparar tu equipo con tres herramientas básicas.

### Paso 1: Instalar los programas necesarios
Piensa en esto como instalar Office o un navegador; solo descarga y dale a "Siguiente" en todo:

1. **Instalar Git:** [Descárgalo aquí](https://git-scm.com/download/win). (Es lo que nos permite bajar el código de la nube a tu PC).
2. **Instalar Node.js:** [Descarga la versión "LTS" aquí](https://nodejs.org/). (Es el motor que permite que el proyecto funcione).
3. **Instalar VS Code (Opcional pero recomendado):** [Descárgalo aquí](https://code.visualstudio.com/). Es el programa donde podrás ver los archivos.

### Paso 2: Descargar el proyecto a tu PC
1. Busca una carpeta en tu computadora donde quieras guardar el proyecto.
2. Haz clic derecho en un espacio vacío de esa carpeta y elige **"Abrir en Terminal"** (o busca "Terminal" en el menú de inicio de Windows).
3. Copia y pega este comando y presiona Enter:
   ```bash
   git clone https://github.com/DaVas1410/infracoop.git
   ```
4. Ahora entra a la carpeta que se creó escribiendo:
   ```bash
   cd infracoop
   ```

### Paso 3: Ponerlo a funcionar (Comandos diarios)
Ahora que ya tienes el código, usa estos comandos dentro de la Terminal (uno por uno):

* **Para preparar todo por primera vez:**
  ```bash
  npm install
  ```
  *(Esto descarga todas las piezas del rompecabezas que faltan. Solo se hace una vez).*

* **Para VER el proyecto en tu navegador:**
  ```bash
  npm run dev
  ```
  *(Una vez que termine de cargar, abre tu navegador y escribe esta dirección: `http://localhost:5173`).*

* **Para que el Modelo procese información nueva:**
  Si agregas nuevos documentos o textos al proyecto, usa este comando para que el modelo los "aprenda":
  ```bash
  npm run embed
  ```

* **Para revisar que todo esté perfecto:**
  El proyecto tiene 106 pruebas automáticas de calidad. Para ver si todo está bien, usa:
  ```bash
  npm test
  ```

---

**¿Necesitas ayuda con algo?**
Si algún paso te da un mensaje de error o sientes que falta alguna configuración, **por favor menciónanoslo de inmediato**. Podemos conectarnos contigo para asistirte y dejar todo configurado correctamente.
