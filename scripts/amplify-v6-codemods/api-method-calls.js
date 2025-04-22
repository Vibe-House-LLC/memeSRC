module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  // Track used REST methods
  const used = new Set();
  ['get','post','put','del'].forEach(meth => {
    root.find(j.CallExpression, {
      callee: { type: 'MemberExpression', object: { name: 'API' }, property: { name: meth } }
    }).forEach(path => {
      // Replace API.{meth}(name, path, opts) ➔ {meth}({ apiName, path, options })
      const args = path.node.arguments;
      const apiName = args[0] || j.literal(null);
      const p = args[1] || j.literal(null);
      const opts = args[2];
      const props = [
        j.property('init', j.identifier('apiName'), apiName),
        j.property('init', j.identifier('path'), p)
      ];
      if (opts) props.push(j.property('init', j.identifier('options'), opts));
      const obj = j.objectExpression(props);
      path.replace(j.callExpression(j.identifier(meth), [obj]));
      used.add(meth);
    });
  });
  // Remove obsolete import of API from 'aws-amplify/api'
  root.find(j.ImportDeclaration, { source: { value: 'aws-amplify/api' } })
    .forEach(path => {
      const specifiers = path.node.specifiers.filter(s => !(s.imported && s.imported.name === 'API'));
      if (specifiers.length) {
        path.node.specifiers = specifiers;
      } else {
        j(path).remove();
      }
    });
  // Insert imports for used REST methods from 'aws-amplify/api'
  if (used.size) {
    const specs = Array.from(used).sort().map(name => j.importSpecifier(j.identifier(name)));
    const imp = j.importDeclaration(specs, j.literal('aws-amplify/api'));
    root.get().node.program.body.unshift(imp);
  }
  return root.toSource({ quote: 'single' });
};
