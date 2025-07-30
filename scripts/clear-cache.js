#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

console.log('🧹 Clearing Next.js cache...');

const projectRoot = path.resolve(__dirname, '..');
const nextCacheDir = path.join(projectRoot, '.next');

if (fs.existsSync(nextCacheDir)) {
  deleteFolderRecursive(nextCacheDir);
  console.log('✅ Next.js cache cleared (.next folder deleted)');
} else {
  console.log('ℹ️  No Next.js cache found');
}

console.log('🚀 Cache clearing complete. Please restart your development server.');
console.log('   Run: npm run dev');