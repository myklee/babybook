#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Color patterns to detect
const colorPatterns = [
  /#[0-9a-fA-F]{3,8}/g,  // Hex colors
  /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g,  // RGB colors
  /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g,  // RGBA colors
  /hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)/g,  // HSL colors
  /hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)/g,  // HSLA colors
];

// Allowed hardcoded colors (exceptions)
const allowedColors = [
  '#000',
  '#fff',
  '#ffffff',
  '#000000',
  'transparent',
  'inherit',
  'currentColor',
  // SVG colors in icon files are allowed
  // Test file colors are allowed
];

// Directories to scan
const scanDirs = ['src/components', 'src/views', 'src/styles'];

// File extensions to check
const extensions = ['.vue', '.css', '.scss', '.ts', '.js'];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  colorPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const color = match[0];
      
      // Skip allowed colors
      if (allowedColors.includes(color.toLowerCase())) {
        continue;
      }
      
      // Skip if it's already a CSS variable
      if (content.substring(match.index - 10, match.index).includes('var(--')) {
        continue;
      }
      
      // Skip if it's in a comment
      const lineStart = content.lastIndexOf('\n', match.index);
      const lineEnd = content.indexOf('\n', match.index);
      const line = content.substring(lineStart + 1, lineEnd);
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
        continue;
      }
      
      // Get line number
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      issues.push({
        file: filePath,
        line: lineNumber,
        color: color,
        context: line.trim()
      });
    }
  });
  
  return issues;
}

function scanDirectory(dir) {
  const issues = [];
  
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping...`);
    return issues;
  }
  
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      issues.push(...scanDirectory(fullPath));
    } else if (extensions.some(ext => file.name.endsWith(ext))) {
      // Skip test files and demo files
      if (file.name.includes('.test.') || 
          file.name.includes('.spec.') || 
          file.name.includes('Demo.vue') ||
          file.name.includes('test-')) {
        return;
      }
      
      issues.push(...scanFile(fullPath));
    }
  });
  
  return issues;
}

function main() {
  console.log('🔍 Scanning for hardcoded colors...\n');
  
  let allIssues = [];
  
  scanDirs.forEach(dir => {
    console.log(`Scanning ${dir}...`);
    const issues = scanDirectory(dir);
    allIssues.push(...issues);
  });
  
  if (allIssues.length === 0) {
    console.log('✅ No hardcoded colors found! All components are using design system variables.');
    process.exit(0);
  } else {
    console.log(`\n❌ Found ${allIssues.length} hardcoded color(s):\n`);
    
    // Group by file
    const issuesByFile = {};
    allIssues.forEach(issue => {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    });
    
    Object.keys(issuesByFile).forEach(file => {
      console.log(`📄 ${file}:`);
      issuesByFile[file].forEach(issue => {
        console.log(`   Line ${issue.line}: ${issue.color} in "${issue.context}"`);
      });
      console.log('');
    });
    
    console.log('💡 Consider replacing these with CSS variables from the design system.');
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { scanFile, scanDirectory };