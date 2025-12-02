import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const SHARED_DIR = path.join(SRC_DIR, 'shared');
const TYPES_DIR = path.join(SRC_DIR, 'types');

let hasErrors = false;

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileDir = path.dirname(filePath);

  lines.forEach((line, index) => {
    // Buscar imports
    const match = line.match(/from\s+['"](\.[^'"]+)['"]/);
    if (match) {
      const importPath = match[1];

      try {
        // Resolver path absoluto
        const resolvedPath = path.resolve(fileDir, importPath);

        // Verificar si apunta a shared o types en el root
        // Usamos startsWith para ver si está dentro de esas carpetas
        const isShared = resolvedPath.startsWith(SHARED_DIR);
        const isTypes = resolvedPath.startsWith(TYPES_DIR);

        if (isShared || isTypes) {
          // Si apunta a shared o types, DEBE usar alias, NO relativo
          // Excepción: Si el archivo ya está dentro de shared o types, puede usar relativos internos?
          // El usuario dijo: "Cualquier import que “suba demasiado” y salga del dominio debe quedar con @/."
          // Si estoy en src/shared/components/ui/Button.tsx y hago import ... from './Input', es válido.
          // Si estoy en src/features/auth/api/authApi.ts y hago import ... from '../../../shared/api', es INVÁLIDO.

          const fileInShared = filePath.startsWith(SHARED_DIR);
          const fileInTypes = filePath.startsWith(TYPES_DIR);

          // Si el archivo NO está en shared/types, pero importa de ahí relativamente -> ERROR
          if (!fileInShared && !fileInTypes) {
            console.error(`Error en ${path.relative(ROOT_DIR, filePath)}:${index + 1}`);
            console.error(`  ${line.trim()} -> Debe usar alias @/`);
            hasErrors = true;
          }
        }
      } catch (e) {
        // Ignorar errores de resolución
      }
    }
  });
}

console.log('Verificando imports prohibidos...');
scanDirectory(SRC_DIR);

if (hasErrors) {
  console.error('\n❌ Se encontraron imports relativos prohibidos hacia @/shared o @/types.');
  process.exit(1);
} else {
  console.log('✅ Todos los imports parecen correctos.');
  process.exit(0);
}
