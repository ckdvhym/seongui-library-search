import {runRegressionSuite} from '../lib/regression-suite.mjs';
const r=runRegressionSuite();
for(const t of r.tests){if(t.ok)console.log('PASS',t.name);else console.error('FAIL',t.name,t.detail||'');}
console.log(`\nRESULT ${r.passed} passed, ${r.failed} failed`);
if(r.failed)process.exit(1);
