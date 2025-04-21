module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  const used = new Set();
  const map = {
    signIn: { fn: 'signIn', wrap: args => j.objectExpression([
      j.property('init', j.identifier('username'), args[0] || j.literal(null)),
      j.property('init', j.identifier('password'), args[1] || j.literal(null))
    ])},
    currentAuthenticatedUser: { fn: 'getCurrentUser', wrap: () => null },
    signUp: { fn: 'signUp', wrap: args => {
      const obj = args[0]; if (obj && obj.type === 'ObjectExpression') {
        let username, password, attributes;
        obj.properties.forEach(p => {
          if (p.key.name === 'username') username = p.value;
          else if (p.key.name === 'password') password = p.value;
          else if (p.key.name === 'attributes') attributes = p.value;
        });
        const props = [];
        if (username) props.push(j.property('init', j.identifier('username'), username));
        if (password) props.push(j.property('init', j.identifier('password'), password));
        const opts = [];
        if (attributes) opts.push(j.property('init', j.identifier('userAttributes'), attributes));
        props.push(j.property('init', j.identifier('options'), j.objectExpression(opts)));
        return j.objectExpression(props);
      }
      return null;
    }},
    confirmSignUp: { fn: 'confirmSignUp', wrap: args => {
      const props = [];
      if (args[0]) props.push(j.property('init', j.identifier('username'), args[0]));
      if (args[1]) props.push(j.property('init', j.identifier('code'), args[1]));
      if (args[2]) props.push(j.property('init', j.identifier('options'), args[2]));
      return j.objectExpression(props);
    }},
    forgotPassword: { fn: 'forgotPassword', wrap: args => j.objectExpression([
      j.property('init', j.identifier('username'), args[0] || j.literal(null))
    ])},
    signOut: { fn: 'signOut', wrap: args => {
      if (args.length) return j.objectExpression([j.property('init', j.identifier('global'), args[0])]);
      return null;
    }},
    fetchAuthSession: { fn: 'fetchAuthSession', wrap: () => null }
  };

  root.find(j.CallExpression, {
    callee: { type: 'MemberExpression', object: { name: 'Auth' } }
  }).forEach(p => {
    const name = p.node.callee.property.name;
    const m = map[name];
    if (m) {
      used.add(m.fn);
      const wrapped = m.wrap(p.node.arguments);
      const args = wrapped ? [wrapped] : [];
      p.replace(j.callExpression(j.identifier(m.fn), args));
    }
  });

  if (used.size) {
    const specs = Array.from(used).sort().map(n => j.importSpecifier(j.identifier(n)));
    const imp = j.importDeclaration(specs, j.literal('aws-amplify/auth'));
    root.get().node.program.body.unshift(imp);
  }

  return root.toSource({ quote: 'single' });
};
