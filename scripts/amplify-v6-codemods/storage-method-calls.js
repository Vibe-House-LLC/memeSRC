module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  // Track used Storage helper functions
  const used = new Set();
  root.find(j.CallExpression, {
    callee: { type: 'MemberExpression', object: { name: 'Storage' } }
  }).forEach(path => {
    const method = path.node.callee.property.name;
    const args = path.node.arguments;
    let fnName; let props = [];
    if (method === 'put') {
      fnName = 'uploadData';
      props = [
        j.property('init', j.identifier('key'), args[0] || j.literal(null)),
        j.property('init', j.identifier('data'), args[1] || j.literal(null))
      ];
      if (args[2]) props.push(j.property('init', j.identifier('options'), args[2]));
    } else if (method === 'get') {
      const opts = args[1];
      const download = opts && opts.type === 'ObjectExpression' && opts.properties.some(p => p.key.name === 'download');
      fnName = download ? 'downloadData' : 'getUrl';
      props = [j.property('init', j.identifier('key'), args[0] || j.literal(null))];
      if (opts) props.push(j.property('init', j.identifier('options'), opts));
    } else if (method === 'list') {
      fnName = 'list';
      props = [j.property('init', j.identifier('path'), args[0] || j.literal(null))];
      if (args[1]) props.push(j.property('init', j.identifier('options'), args[1]));
    } else if (method === 'remove') {
      fnName = 'remove';
      props = [j.property('init', j.identifier('key'), args[0] || j.literal(null))];
      if (args[1]) props.push(j.property('init', j.identifier('options'), args[1]));
    }
    if (fnName) {
      const obj = j.objectExpression(props);
      path.replace(j.callExpression(j.identifier(fnName), [obj]));
      used.add(fnName);
    }
  });
  // Remove obsolete import of Storage from 'aws-amplify/storage'
  root.find(j.ImportDeclaration, { source: { value: 'aws-amplify/storage' } })
    .forEach(path => {
      const specifiers = path.node.specifiers.filter(s => !(s.imported && s.imported.name === 'Storage'));
      if (specifiers.length) {
        path.node.specifiers = specifiers;
      } else {
        j(path).remove();
      }
    });
  // Insert imports for used Storage helpers
  if (used.size) {
    const specs = Array.from(used).sort().map(name => j.importSpecifier(j.identifier(name)));
    const imp = j.importDeclaration(specs, j.literal('aws-amplify/storage'));
    root.get().node.program.body.unshift(imp);
  }
  return root.toSource({ quote: 'single' });
};
