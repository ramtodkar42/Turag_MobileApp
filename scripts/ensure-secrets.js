// Creates src/api/secrets.js from secrets.example.js when it's missing (it's
// git-ignored, so a fresh checkout doesn't have it and the app wouldn't build).
// Runs after `npm install`. Never overwrites an existing secrets.js.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'api');
const target = path.join(dir, 'secrets.js');
if (!fs.existsSync(target)) {
  fs.copyFileSync(path.join(dir, 'secrets.example.js'), target);
  console.log('Created src/api/secrets.js (empty keys) - add your own for testing.');
}
