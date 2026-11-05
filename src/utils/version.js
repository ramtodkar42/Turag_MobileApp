const parts = version => String(version).split('.').map(part => Number(part) || 0);

// Is `a` a later version than `b`? Compares number by number, so 1.0.10 is later than
// 1.0.9 and 1.0 is the same as 1.0.0.
export const isNewerVersion = (a, b) => {
  const left = parts(a);
  const right = parts(b);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
};
