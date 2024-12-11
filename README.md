# Nunjucks Dependencies

Return a list of dependencies from a (list of) Nunjucks template(s).

## Why

When calling Nunjucks compilation via the API, it will process all paths given as input. In the event only a single file is changed, it will still recompile all files. This is not ideal for large projects with many templates. This function will return a list of dependencies for a given template, so you can only recompile the changed files. There is no globbing support, you need to provide the full list of templates.

>**NOTE**: This is a quick optimisation for my specific use case. It might not be generic enough for your needs. Success may vary.

## Usage

Before you call the Nunjucks compilation, call the `getDependencies` function with the paths to the files that have been modified. Optionally include a regex that will match only "output" templates, so the list can be pre-filtered. You will end up with a list of dependencies that you can use to only recompile the changed files.

You can call the function like this:

```javascript
const subset = await getDependencyList(modifiedFilePath, arrayOfAllTemplatePaths, /^website\/templates\/pages\//, true, 'website/')
```

You will get an array of paths that you can use to recompile. If no match is found, the function will return the full list of templates.

### Example

Given a list of templates in `website/templates/pages/**` with any base templates in `website/templates/` and separately imported templates in `website/components/**`, you can call the function like this:

```javascript
import { getDependencyList } from '@eklingen/nunjucks-dependencies'
export const getTemplateSubset = async (path, paths = [], pagesPath = '') => {
  if (!path) {
    return paths
  }

  if (path.includes(pagesPath)) {
    return path
  }

  const dependencies = await getDependencyList(path, paths, /^website\/templates\/pages\//, true, 'website/')

  return dependencies.length ? dependencies : paths
}

const renderPaths = await getTemplateSubset('components/atoms/button/button.html', ['website/templates/pages/**/*.html'], 'website/templates/pages')
```

## Alternative usage

You can also get the full dependency list of all templates, non-filtered. This can be useful if you want to know all dependencies for a given template.

```javascript
import { getFullDependencyList } from '@eklingen/nunjucks-dependencies'
const dependencies = await getFullDependencyList(['website/templates/pages/**/*.html'], null, true, 'website/')
```

## Dependencies

This package has no dependencies.

---

Copyright (c) 2024 Elco Klingen. MIT License.
