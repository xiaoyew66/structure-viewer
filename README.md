# React + TypeScript + Vite

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## License
This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.


## TECHOLOGIES - React + TypeScript + Vite
Here’s a quick rundown of the main technologies and patterns this app uses:

React + TypeScript
Functional components with hooks (useState, useEffect) manage UI state and lifecycles, while CSSProperties gives you type-safe inline styles.

3Dmol.js
A pure-JavaScript, WebGL-based molecular viewer. You use it to load your PDB, pick rendering modes (cartoon, stick, sphere), handle clicks/hover, 
and add labels.

Browser APIs

FileReader reads user-uploaded PDB files.

fetch pulls PDBs by ID from RCSB.

sessionStorage preserves your last file, rendering mode, filters, radii, etc. across reloads.

Inline Styling Layout
You define a small set of const style objects (controlRow, labelStyle, inputFlex) for consistent spacing and alignment, all applied directly via the style={…} prop.

PDB Parsing
A tiny text‐processing function remaps columns 18–20 to “VAL” or “TIP” so you can treat protein vs water uniformly in your 3Dmol selectors.

Put together, you get a lightweight React+TS front end, minimal CSS, and 3Dmol.js driving the WebGL canvas under the hood.


## DEPLOYMENT
# 1. Install and lock down your dependencies
npm install
npm ci         # (optional) to get a repeatable install based on your lockfile

# 2. Configure your index.html to pull in the 3Dmol.js script
<!-- in public/index.html (or wherever your static HTML lives) -->
<script src="https://3Dmol.org/build/3Dmol-min.js"></script>
That way the built app will always find the 3Dmol runtime from the CDN.

# 3. Build your production bundle
If you’re using Create-React-App:

npm run build
→ produces a build/ folder of static assets.

If you’re on Vite:
npm run build
→ produces a dist/ folder.

# 4. Verify locally
# with CRA
npx serve build

# or with Vite
npx serve dist
Browse to http://localhost:5000 (or whatever port) and confirm your viewer loads and the controls work.

# 5. Choose a static‐host and publish

# 6. Key points
The only runtime dependency is the 3Dmol.js CDN include in index.html.
Everything else is pure client-side, so any static-file host works.


## npm COMMANDS
Here’s a quick “npm-first” setup you can follow (using Vite + React + TypeScript):
# 1. Scaffold a new Vite + React + TS project
npm create vite@latest my-mol-viewer -- --template react-ts

# 2. Move into your project
cd my-mol-viewer

# 3. Install all dependencies
npm install

# 4. Spin up the dev server
npm run dev
# → open http://localhost:5173 to see your app

# 5. Build for production
npm run build
# → outputs to dist/

# 6. Preview the production build locally
npm run preview
