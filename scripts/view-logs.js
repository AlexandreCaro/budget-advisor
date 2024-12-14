const fs = require('fs');
const path = require('path');

// Get log directory based on environment
const baseDir = process.env.NODE_ENV === 'production'
  ? '/var/log/budget-advisor'
  : path.join(process.cwd(), 'data', 'logs');

// Get date from command line argument or use today
const date = process.argv[2] ? new Date(process.argv[2]) : new Date();
const datePath = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
const logDir = path.join(baseDir, datePath);

console.log(`Looking for logs in: ${logDir}`);

if (!fs.existsSync(logDir)) {
  console.log('No logs found for this date');
  process.exit(0);
}

// List all log files
const logFiles = fs.readdirSync(logDir)
  .filter(file => file.startsWith('server-') && file.endsWith('.log'));

if (logFiles.length === 0) {
  console.log('No log files found for this date');
  process.exit(0);
}

console.log('\nFound log files:');
logFiles.forEach((file, index) => {
  const stats = fs.statSync(path.join(logDir, file));
  console.log(`${index + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
});

// If file number provided as second argument, show its contents
const fileNum = process.argv[3];
if (fileNum && fileNum > 0 && fileNum <= logFiles.length) {
  const selectedFile = logFiles[fileNum - 1];
  const filePath = path.join(logDir, selectedFile);
  console.log(`\nContents of ${selectedFile}:`);
  console.log('='.repeat(80));
  console.log(fs.readFileSync(filePath, 'utf8'));
}

// Usage instructions
if (!fileNum) {
  console.log('\nTo view a specific log file, run:');
  console.log('node scripts/view-logs.js [date] [file-number]');
  console.log('Example: node scripts/view-logs.js 2024-01-12 1');
} 