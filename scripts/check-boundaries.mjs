import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const srcRoot = path.join(projectRoot, 'src')

const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/
const SERVER_FILE_PATTERN = /\.server\.(ts|tsx)$/

function walk(dir) {
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      files.push(...walk(fullPath))
      continue
    }
    if (SOURCE_FILE_PATTERN.test(fullPath)) {
      files.push(fullPath)
    }
  }
  return files
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function parseImportSpecifiers(source) {
  const specifiers = []
  const importRegex = /import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g
  const exportRegex = /export\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g

  for (const match of source.matchAll(importRegex)) {
    specifiers.push(match[1])
  }
  for (const match of source.matchAll(exportRegex)) {
    specifiers.push(match[1])
  }

  return specifiers
}

function roleFromModulePath(filePath) {
  const match = filePath.match(/^src\/modules\/([^/]+)\//)
  return match ? match[1] : null
}

function isGroupedRoute(filePath) {
  return (
    filePath.startsWith('src/routes/(fan)/') ||
    filePath.startsWith('src/routes/(crew)/') ||
    filePath.startsWith('src/routes/(admin)/')
  )
}

const violations = []
const files = walk(srcRoot)

for (const absoluteFilePath of files) {
  const relativeFilePath = toPosix(path.relative(projectRoot, absoluteFilePath))
  const source = readFileSync(absoluteFilePath, 'utf8')
  const imports = parseImportSpecifiers(source)
  const isServerFile = SERVER_FILE_PATTERN.test(relativeFilePath) || relativeFilePath.startsWith('src/server/')

  for (const specifier of imports) {
    // Shared must be leaf-level reusable; no upward imports.
    if (
      relativeFilePath.startsWith('src/shared/') &&
      (specifier.startsWith('@/modules/') ||
        specifier.startsWith('@/features/') ||
        specifier.startsWith('@/entities/'))
    ) {
      violations.push(`${relativeFilePath} -> ${specifier} (shared cannot import modules/features/entities)`)
    }

    // Entities are thin data-access only.
    if (
      relativeFilePath.startsWith('src/entities/') &&
      (specifier.startsWith('@/modules/') || specifier.startsWith('@/features/'))
    ) {
      violations.push(`${relativeFilePath} -> ${specifier} (entities cannot import modules/features)`)
    }

    // Modules cannot cross-import other role modules.
    if (relativeFilePath.startsWith('src/modules/') && specifier.startsWith('@/modules/')) {
      const sourceRole = roleFromModulePath(relativeFilePath)
      const targetRole = specifier.replace('@/modules/', '').split('/')[0]
      if (sourceRole && targetRole && sourceRole !== targetRole) {
        violations.push(
          `${relativeFilePath} -> ${specifier} (cross-role module import is not allowed: ${sourceRole} -> ${targetRole})`,
        )
      }
    }

    // Client bundles must not import server-only modules.
    if (!isServerFile && (specifier.startsWith('@/server/') || specifier.includes('.server'))) {
      violations.push(`${relativeFilePath} -> ${specifier} (client file importing server-only module)`)
    }

    // Role routes should stay thin and compose from modules/shared only.
    if (
      isGroupedRoute(relativeFilePath) &&
      (specifier.startsWith('@/components/') ||
        specifier.startsWith('@/lib/') ||
        specifier.startsWith('@/features/') ||
        specifier.startsWith('@/entities/'))
    ) {
      violations.push(`${relativeFilePath} -> ${specifier} (role route is not thin; import via modules/shared)`)
    }
  }
}

if (violations.length > 0) {
  console.error('Import boundary violations found:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log('Import boundaries check passed.')
