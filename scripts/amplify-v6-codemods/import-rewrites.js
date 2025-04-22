module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  root.find(j.ImportDeclaration, { source: { value: 'aws-amplify' } })
    .forEach(path => {
      // Only handle named imports; drop deprecated graphqlOperation
      const specifiers = path.node.specifiers.filter(s => s.type === 'ImportSpecifier');
      const authSpec = [];
      const apiSpec = [];
      const storageSpec = [];
      const otherSpec = [];
      specifiers.forEach(s => {
        const name = s.imported.name;
        if (name === 'Auth') authSpec.push(s);
        else if (name === 'API') apiSpec.push(s);
        else if (name === 'Storage') storageSpec.push(s);
        else if (name !== 'graphqlOperation') otherSpec.push(s);
      });
      const newImports = [];
      if (authSpec.length) newImports.push(j.importDeclaration(authSpec, j.literal('aws-amplify/auth')));
      if (apiSpec.length) newImports.push(j.importDeclaration(apiSpec, j.literal('aws-amplify/api')));
      if (storageSpec.length) newImports.push(j.importDeclaration(storageSpec, j.literal('aws-amplify/storage')));
      if (otherSpec.length) newImports.push(j.importDeclaration(otherSpec, j.literal('aws-amplify')));
      j(path).replaceWith(newImports);
    });
  return root.toSource({ quote: 'single' });
};
