#!/usr/bin/env node
/**
 * Code generation script for MettaModeler
 * Generates TypeScript types, Zod schemas, and Python Pydantic models from JSON Schema files
 */

import { readdir, writeFile, readFile, mkdir } from 'fs/promises';
import { join, basename, extname, dirname } from 'path';
import { execSync } from 'child_process';
import $RefParser from '@apidevtools/json-schema-ref-parser';

const SCHEMAS_DIR = './schemas';
const OUTPUT_DIRS = {
  tsClient: './client/src/api/types',
  tsServer: './server/types/generated',
  zod: './server/types/generated',
  python: './python_sim/schemas'
};

async function getSchemaFiles() {
  const files = await readdir(SCHEMAS_DIR);
  return files.filter(f => f.endsWith('.json')).map(f => join(SCHEMAS_DIR, f));
}

function getOutputName(schemaPath, extension) {
  const base = basename(schemaPath, '.json');
  return `${base}${extension}`;
}

async function bundleSchema(schemaPath) {
  // Bundle schema to resolve all $ref
  const bundled = await $RefParser.bundle(schemaPath, {
    resolve: {
      file: {
        canRead: /\.json$/i,
        read: async (file) => {
          const content = await readFile(file.url, 'utf8');
          return JSON.parse(content);
        }
      }
    }
  });
  return bundled;
}

async function generateTypeScript(schemaPath, outputDir) {
  const outputFile = join(outputDir, getOutputName(schemaPath, '.ts'));
  try {
    // Bundle schema first to resolve $ref
    const bundled = await bundleSchema(schemaPath);
    const bundledPath = schemaPath.replace('.json', '.bundled.json');
    await writeFile(bundledPath, JSON.stringify(bundled, null, 2));
    
    execSync(`npx json-schema-to-typescript "${bundledPath}" > "${outputFile}"`, {
      stdio: 'inherit'
    });
    
    // Clean up bundled file
    await import('fs/promises').then(fs => fs.unlink(bundledPath).catch(() => {}));
    
    console.log(`✓ Generated ${outputFile}`);
  } catch (error) {
    console.error(`✗ Failed to generate ${outputFile}:`, error.message);
    throw error;
  }
}

async function generateZod(schemaPath) {
  const outputFile = join(OUTPUT_DIRS.zod, getOutputName(schemaPath, '.zod.ts'));
  try {
    // Bundle schema first to resolve $ref
    const bundled = await bundleSchema(schemaPath);
    const bundledPath = schemaPath.replace('.json', '.bundled.json');
    await writeFile(bundledPath, JSON.stringify(bundled, null, 2));
    
    execSync(`npx json-schema-to-zod --input "${bundledPath}" --output "${outputFile}"`, {
      stdio: 'inherit'
    });
    
    // Clean up bundled file
    await import('fs/promises').then(fs => fs.unlink(bundledPath).catch(() => {}));
    
    console.log(`✓ Generated ${outputFile}`);
  } catch (error) {
    console.error(`✗ Failed to generate ${outputFile}:`, error.message);
    throw error;
  }
}

async function generatePython(schemaPath) {
  const baseName = basename(schemaPath, '.json').toLowerCase().replace(/\./g, '_');
  const outputFile = join(OUTPUT_DIRS.python, `${baseName}.py`);
  try {
    // Bundle schema first to resolve $ref
    const bundled = await bundleSchema(schemaPath);
    const bundledPath = schemaPath.replace('.json', '.bundled.json');
    await writeFile(bundledPath, JSON.stringify(bundled, null, 2));
    
    execSync(`datamodel-codegen --input "${bundledPath}" --input-file-type jsonschema --output "${outputFile}"`, {
      stdio: 'inherit'
    });
    
    // Clean up bundled file
    await import('fs/promises').then(fs => fs.unlink(bundledPath).catch(() => {}));
    
    console.log(`✓ Generated ${outputFile}`);
  } catch (error) {
    console.error(`✗ Failed to generate ${outputFile}:`, error.message);
    throw error;
  }
}

async function main() {
  const command = process.argv[2] || 'all';
  const schemaFiles = await getSchemaFiles();
  
  console.log(`Found ${schemaFiles.length} schema files`);
  
  if (command === 'ts' || command === 'all') {
    console.log('\n📝 Generating TypeScript types...');
    for (const schema of schemaFiles) {
      await generateTypeScript(schema, OUTPUT_DIRS.tsClient);
      await generateTypeScript(schema, OUTPUT_DIRS.tsServer);
    }
  }
  
  if (command === 'zod' || command === 'all') {
    console.log('\n🔒 Generating Zod schemas...');
    for (const schema of schemaFiles) {
      await generateZod(schema);
    }
  }
  
  if (command === 'py' || command === 'all') {
    console.log('\n🐍 Generating Python Pydantic models...');
    for (const schema of schemaFiles) {
      await generatePython(schema);
    }
  }
  
  console.log('\n✅ Code generation complete!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

