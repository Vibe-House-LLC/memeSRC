module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  root.find(j.CallExpression, {
    callee: { type: 'MemberExpression', object: { name: 'Storage' } }
  }).forEach(path => {
    const method = path.node.callee.property.name;
    const args = path.node.arguments;
    let fnName, props = [];
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
    const obj = j.objectExpression(props);
    path.replace(j.callExpression(j.identifier(fnName), [obj]));
  });
  return root.toSource({ quote: 'single' });
};
