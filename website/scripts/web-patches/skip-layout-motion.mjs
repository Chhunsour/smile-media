// Applied only to the isolated Expo source copy. Native animation expressions stay intact.
export function skipWebLayoutMotion(source, parse) {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const animated = new Set(ast.program.body
    .filter(node => node.type === 'ImportDeclaration' && node.source.value === 'react-native-reanimated')
    .flatMap(node => node.specifiers.filter(spec => spec.type === 'ImportDefaultSpecifier').map(spec => spec.local.name)));
  const edits = [], properties = [];
  let wrappers = 0;
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXOpeningElement' && node.name.type === 'JSXMemberExpression'
      && animated.has(node.name.object.name)) {
      const motion = node.attributes.filter(attribute => attribute.type === 'JSXAttribute'
        && ['entering', 'exiting', 'layout'].includes(attribute.name.name));
      for (const attribute of motion) {
        if (attribute.value?.type !== 'JSXExpressionContainer') throw new Error(`Unsupported ${attribute.name.name} animation prop`);
        const expression = attribute.value.expression;
        edits.push({ start: expression.start, end: expression.end,
          value: `WebAnimationPlatform.OS === 'web' ? undefined : (${source.slice(expression.start, expression.end)})` });
        properties.push(attribute.name.name);
      }
      if (motion.length) {
        if (node.attributes.some(attribute => attribute.name?.name === 'testID')) throw new Error('Review existing animation testID before patching');
        edits.push({ start: node.name.end, end: node.name.end,
          value: ` testID={WebAnimationPlatform.OS === 'web' ? 'web-motion-final' : undefined}` });
        wrappers++;
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(child => { if (child?.type) visit(child); });
      else if (value?.type) visit(value);
    }
  }
  visit(ast.program);
  for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.value + source.slice(edit.end);
  if (wrappers) source = `import { Platform as WebAnimationPlatform } from 'react-native';\n${source}`;
  return { source, wrappers, properties };
}
