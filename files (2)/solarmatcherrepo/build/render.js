// ============================================================
// Minimal, dependency-free template renderer.
// Supports:
//   {{var}}              simple substitution (HTML-escaped)
//   {{{var}}}             raw / unescaped substitution (for partials)
//   {{#each list}}...{{/each}}   with {{this}} / {{this.field}} inside
//   {{#if cond}}...{{else}}...{{/if}}
// Deliberately tiny — this is a static site of dozens/hundreds of
// near-identical pages, not an app, so a full templating library
// would be more complexity than the problem needs.
// ============================================================

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getPath(data, path) {
  if (path === 'this') return data;
  return path
    .replace(/^this\./, '')
    .split('.')
    .reduce((acc, key) => (acc === undefined || acc === null ? undefined : acc[key]), data);
}

function renderEach(template, data) {
  const eachRegex = /{{#each ([\w.]+)}}([\s\S]*?){{\/each}}/g;
  return template.replace(eachRegex, (match, listPath, inner) => {
    const list = getPath(data, listPath);
    if (!Array.isArray(list)) return '';
    return list
      .map((item) => render(inner, typeof item === 'object' ? { ...data, ...item, this: item } : { ...data, this: item }))
      .join('');
  });
}

function renderIf(template, data) {
  const ifRegex = /{{#if ([\w.]+)}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g;
  return template.replace(ifRegex, (match, condPath, truthy, falsy) => {
    const value = getPath(data, condPath);
    const isTruthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
    return render(isTruthy ? truthy : (falsy || ''), data);
  });
}

function renderVars(template, data) {
  return template
    .replace(/{{{\s*([\w.]+)\s*}}}/g, (match, path) => {
      const value = getPath(data, path);
      return value === undefined || value === null ? '' : String(value);
    })
    .replace(/{{\s*([\w.]+)\s*}}/g, (match, path) => escapeHtml(getPath(data, path)));
}

function render(template, data) {
  let out = template;
  out = renderEach(out, data);
  out = renderIf(out, data);
  out = renderVars(out, data);
  return out;
}

module.exports = { render };
