# Flashcards App

Aplicación React para crear y estudiar flashcards desde archivos CSV.

## Características

- 📁 Carga múltiples archivos CSV
- 💾 Guardado automático en el navegador (localStorage)
- 🎴 Visualización de flashcards con efecto flip
- 📤 Exportar tarjetas a CSV
- 🌙 Tema oscuro por defecto

## Formato CSV

El formato esperado es simple: sin encabezados, dos columnas separadas por coma:
- Columna 1: Pregunta
- Columna 2: Respuesta

Ejemplo:
```
¿Qué es React?,Una biblioteca de JavaScript para construir interfaces de usuario
¿Qué es Vite?,Un build tool para desarrollo frontend moderno
```

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

## Despliegue Gratuito

### Opción 1: Vercel (Recomendado - Más fácil)

1. **Crear cuenta en GitHub** (si no tienes):
   - Ve a [github.com](https://github.com) y crea una cuenta

2. **Subir tu código a GitHub**:
   ```bash
   # Inicializar git (si no lo has hecho)
   git init
   git add .
   git commit -m "Initial commit"
   
   # Crear repositorio en GitHub y luego:
   git remote add origin https://github.com/TU_USUARIO/flashcards-app.git
   git branch -M main
   git push -u origin main
   ```

3. **Desplegar en Vercel**:
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con tu cuenta de GitHub
   - Click en "Add New Project"
   - Selecciona tu repositorio `flashcards-app`
   - Vercel detectará automáticamente que es un proyecto Vite
   - Click en "Deploy"
   - ¡Listo! Tu app estará disponible en una URL como `tu-app.vercel.app`

**Ventajas de Vercel:**
- ✅ Despliegue automático en cada push a GitHub
- ✅ HTTPS gratuito
- ✅ Dominio personalizado gratuito
- ✅ Muy rápido y fácil de usar

### Opción 2: Netlify

1. **Subir código a GitHub** (igual que arriba)

2. **Desplegar en Netlify**:
   - Ve a [netlify.com](https://netlify.com)
   - Inicia sesión con GitHub
   - Click en "Add new site" > "Import an existing project"
   - Selecciona tu repositorio
   - Configuración:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click en "Deploy site"

**Ventajas de Netlify:**
- ✅ Despliegue automático
- ✅ HTTPS gratuito
- ✅ Dominio personalizado gratuito

### Opción 3: GitHub Pages

1. **Instalar gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Agregar script al package.json**:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. **Configurar base en vite.config.js**:
   ```js
   export default defineConfig({
     plugins: [react()],
     base: '/flashcards-app/' // Cambia por el nombre de tu repo
   })
   ```

4. **Desplegar**:
   ```bash
   npm run deploy
   ```

5. **Habilitar GitHub Pages**:
   - Ve a Settings > Pages en tu repositorio
   - Selecciona la rama `gh-pages`
   - Tu app estará en `https://TU_USUARIO.github.io/flashcards-app/`

## Persistencia de Datos

La aplicación guarda automáticamente todas las tarjetas cargadas en el **localStorage del navegador**. Esto significa:

- ✅ Los datos persisten entre sesiones
- ✅ No necesitas servidor backend
- ⚠️ Los datos son específicos del navegador/dispositivo
- ⚠️ Si limpias el caché del navegador, se perderán los datos

## Notas Importantes

- Los archivos CSV se procesan completamente en el navegador (no se suben a ningún servidor)
- Los datos se guardan localmente en tu navegador
- Para compartir datos entre dispositivos, usa la función "Exportar CSV"

## Tecnologías

- React 18
- Vite
- Tailwind CSS

