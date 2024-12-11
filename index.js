import { readFile } from 'node:fs/promises'
import { dirname, resolve as resolvePath } from 'node:path'

const orderObjectKeysAndValues = object =>
  Object.keys(object)
    .sort()
    .reduce((acc, key) => {
      acc[key] = object[key].sort()
      return acc
    }, {})

const turnListInsideOut = dependencies => {
  const results = {}

  for (const path of Object.keys(dependencies)) {
    for (const dependency of dependencies[path]) {
      results[dependency] = results[dependency] || []

      if (!results[dependency].includes(path)) {
        results[dependency].push(path)
      }
    }
  }

  return results
}

// This function returns all dependencies (extends or imports) of a given path.
const getFileDependencies = async (path, resolveRoot = '') => {
  const extendsRegex = /{%\s*extends\s*['"]([^'"]+)['"]\s*%}/ // This regex matches the extends tag in a template: {% extends 'path' %}
  const importRegex = /{%\s*import\s*['"]([^'"]+)['"]\s/g // This regex matches the import tag in a template: {% import 'path' as alias %}
  const resolvedPath = resolvePath(process.cwd(), resolveRoot ? (path.includes(resolveRoot) ? path : resolveRoot + path) : path)

  let contents = ''

  try {
    contents = await readFile(resolvedPath, 'utf8')
  } catch (error) {
    process.stderr.write(`Error reading file at ${resolvedPath}: ${error.message}\n`)
  }

  const extendMatch = contents.match(extendsRegex)
  const importMatches = [...contents.matchAll(importRegex)]
  const extendResult = extendMatch ? extendMatch[1] : null
  const importResults = importMatches.map(match => match[1])

  return { extendResult, importResults }
}

// This function returns all dependencies (extends or imports) of a given path and its dependencies.
export const getFullDependencyList = async (paths, includeRegex, turnInsideOut = true, resolveRoot = '') => {
  const extendsMap = {}
  const importMap = {}
  const visited = new Set()
  const queue = Array.isArray(paths) ? paths : [paths]
  const dependencyCache = {}

  while (queue.length) {
    const currentPath = queue.shift()

    if (visited.has(currentPath)) {
      continue
    }

    visited.add(currentPath)

    if (!dependencyCache[currentPath]) {
      dependencyCache[currentPath] = await getFileDependencies(currentPath, resolveRoot)
    }

    const { extendResult, importResults } = dependencyCache[currentPath]

    if (extendResult) {
      const resolvedExtendResult = extendResult.startsWith('./') ? resolvePath(dirname(currentPath), extendResult) : extendResult
      extendsMap[currentPath] = resolvedExtendResult
      queue.push(resolvedExtendResult)
    }

    if (importResults.length) {
      const resolvedImportResults = importResults.map(path => (path.startsWith('./') ? resolvePath(dirname(currentPath), path) : path))
      importMap[currentPath] = resolvedImportResults
      queue.push(...resolvedImportResults)
    }
  }

  for (const path in extendsMap) {
    const extendedPath = extendsMap[path]

    if (importMap[extendedPath]) {
      importMap[path] = importMap[path] || []
      importMap[path].push(...importMap[extendedPath])
    }
  }

  for (const path of Object.keys(importMap)) {
    const queue = [...importMap[path]]
    const visited = new Set(queue)

    while (queue.length > 0) {
      const dependencyPath = queue.shift()

      if (!importMap[dependencyPath]) {
        continue
      }

      for (const subDependency of importMap[dependencyPath]) {
        if (!visited.has(subDependency)) {
          queue.push(subDependency)
          visited.add(subDependency)
        }
      }
    }

    importMap[path] = Array.from(visited)
  }

  // Delete paths that don't match the includeRegex
  // This is to filter out intermediate dependencies (macro's that call other macro's, for example).
  if (includeRegex) {
    for (const path in importMap) {
      if (!includeRegex.test(path)) {
        delete importMap[path]
      }
    }
  }

  let resultList = orderObjectKeysAndValues(importMap)

  if (turnInsideOut) {
    resultList = turnListInsideOut(resultList)
  }

  return resultList
}

// This function gets the dependencies for paths, then returns the dependencies that apply to path only.
export const getDependencyList = async (path, paths, includeRegex, turnInsideOut = true, resolveRoot = '') => {
  const dependencies = await getFullDependencyList(paths, includeRegex, turnInsideOut, resolveRoot)
  const result = dependencies[Object.keys(dependencies).find(key => path.endsWith(key))] || []

  return result
}
