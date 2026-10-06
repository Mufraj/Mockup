// Validate the current Amazon image-module preview using the existing exports.
process.argv.push('--verify-only');
require('./export-amazon-modules.cjs');
