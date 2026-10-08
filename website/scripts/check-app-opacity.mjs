import assert from 'node:assert/strict';

// Check actual computed styles on content, not just the screen heading or test markers.
// Small deliberately translucent chart bars, off-month dates, pulses and disabled
// controls are not main content; their containing cards and ancestors must be opaque.
export async function inspectAppOpacity(page, probes = []) {
  return page.evaluate(probes => {
    const root = document.querySelector('#root');
    const issues = [], nodes = new Set();
    const active = element => {
      if (!element || !element.getBoundingClientRect().width || !element.getBoundingClientRect().height) return false;
      for (let node = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || node.getAttribute('aria-hidden') === 'true') return false;
      }
      return true;
    };
    const describe = node => ({ tag: node.tagName, class: node.className, testID: node.dataset.testid,
      text: node.textContent.trim().slice(0, 90), opacity: getComputedStyle(node).opacity });
    function ancestors(element) {
      for (let node = element; node; node = node.parentElement) {
        nodes.add(node);
        if (node === document.documentElement) break;
      }
    }
    for (const element of root?.querySelectorAll('[data-testid="web-motion-final"], .bg-card, .bg-bg.flex-1') || []) {
      if (active(element)) ancestors(element);
    }
    for (const probe of probes) {
      const matches = [...root.querySelectorAll('div, button, input, textarea')].filter(element =>
        active(element) && (element.textContent.trim() === probe || element.getAttribute('placeholder') === probe));
      if (!matches.length) issues.push({ probe, reason: 'Main content probe is missing' });
      else ancestors(matches.at(-1));
    }
    for (const node of nodes) {
      const style = getComputedStyle(node);
      if (Number(style.opacity) !== 1) issues.push({ ...describe(node), reason: 'Main content or its ancestor is not fully opaque' });
      if (style.visibility === 'hidden') issues.push({ ...describe(node), reason: 'Main content is hidden' });
    }
    const wrappers = [...root.querySelectorAll('[data-testid="web-motion-final"]')].filter(active);
    for (const node of wrappers) {
      const style = getComputedStyle(node);
      if (style.transform !== 'none' && !new DOMMatrixReadOnly(style.transform).isIdentity) {
        issues.push({ ...describe(node), reason: 'Content wrapper is still transformed', transform: style.transform });
      }
    }
    // Reanimated also creates unmarked transition dummies. Catch paused/running or
    // filled animations on any main-content ancestor, including navigation screens.
    for (const animation of document.getAnimations()) {
      const target = animation.effect?.target;
      if (target && nodes.has(target) && ['running', 'paused', 'finished'].includes(animation.playState)) {
        issues.push({ ...describe(target), reason: 'Content has an unfinished or retained animation',
          animation: animation.animationName || animation.id, state: animation.playState });
      }
    }
    return { nodesChecked: nodes.size, motionWrappers: wrappers.length, opacity: issues.length ? null : 1, issues };
  }, probes);
}

export async function assertAppOpacity(page, name, probes = []) {
  // A short allowance for native navigation transitions; no 10-second grace period
  // can conceal a view that remains dim or a disabled-but-visible empty screen.
  await page.waitForTimeout(350);
  const samples = [];
  for (let sample = 0; sample < 2; sample++) {
    const result = await inspectAppOpacity(page, probes);
    assert.ok(result.nodesChecked > 0, `${name}: no main content was checked`);
    assert.deepEqual(result.issues, [], `${name}: ${JSON.stringify(result.issues)}`);
    samples.push(result);
    if (!sample) await page.waitForTimeout(120);
  }
  return { opacity: 1, nodesChecked: samples.at(-1).nodesChecked, motionWrappers: samples.at(-1).motionWrappers, samples: samples.length };
}
