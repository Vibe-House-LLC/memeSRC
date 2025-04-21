module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  ['get','post','put','del'].forEach(meth => {
    root.find(j.CallExpression, {
      callee: { type: 'MemberExpression', object: { name: 'API' }, property: { name: meth } }
    }).forEach(path => {
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
    });
  });
  return root.toSource({ quote: 'single' });
};
