module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  const has = root.find(j.CallExpression, {
    callee: { type: 'MemberExpression', object: { name: 'API' }, property: { name: 'graphql' } }
  }).size();
  if (!has) return null;
  const imp = j.importDeclaration([j.importSpecifier(j.identifier('generateClient'))], j.literal('aws-amplify/api'));
  const clientDecl = j.variableDeclaration('const', [j.variableDeclarator(j.identifier('client'), j.callExpression(j.identifier('generateClient'), []))]);
  root.get().node.program.body.unshift(clientDecl);
  root.get().node.program.body.unshift(imp);
  root.find(j.CallExpression, {
    callee: { type: 'MemberExpression', object: { name: 'API' }, property: { name: 'graphql' } }
  }).forEach(path => {
    const node = path.node;
    // Only transform calls using graphqlOperation
    if (!(node.arguments[0] && node.arguments[0].type === 'CallExpression' && node.arguments[0].callee.name === 'graphqlOperation')) {
      return;
    }
    // Extract query and variables from graphqlOperation call
    const query = node.arguments[0].arguments[0];
    const variables = node.arguments[0].arguments[1];
    // Determine authMode, default to awsIam
    let auth = j.literal('awsIam');
    if (node.arguments[1] && node.arguments[1].properties) {
      const ap = node.arguments[1].properties.find(p => p.key && p.key.name === 'authMode');
      if (ap) auth = ap.value;
    }
    const props = [j.property('init', j.identifier('query'), query)];
    if (variables) props.push(j.property('init', j.identifier('variables'), variables));
    if (auth) props.push(j.property('init', j.identifier('authMode'), auth));
    const obj = j.objectExpression(props);
    path.replace(j.callExpression(
      j.memberExpression(j.identifier('client'), j.identifier('graphql')),
      [obj]
    ));
  });
  return root.toSource({ quote: 'single' });
};
