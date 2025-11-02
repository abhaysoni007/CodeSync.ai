/**
 * Setup Script for File Explorer
 * Run this once to create necessary directories
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setup() {
  console.log('🚀 Setting up File Explorer...\n');

  try {
    // Create uploads directory
    const uploadsDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');

    // Create file-structures directory
    const structuresDir = path.join(__dirname, 'uploads', 'file-structures');
    await fs.mkdir(structuresDir, { recursive: true });
    console.log('✅ Created file-structures directory');

    // Create a test structure file
    const testProjectId = 'test-project-123';
    const testStructure = {
      id: 'root',
      name: 'root',
      type: 'folder',
      children: [
        {
          id: 'src',
          name: 'src',
          type: 'folder',
          children: [
            {
              id: 'index.js',
              name: 'index.js',
              type: 'file',
              content: '// Welcome to your collaborative code editor!\nconsole.log("Hello World!");'
            },
            {
              id: 'app.js',
              name: 'app.js',
              type: 'file',
              content: '// Your main application file\n\nfunction App() {\n  return "Hello from App!";\n}\n\nexport default App;'
            }
          ]
        },
        {
          id: 'public',
          name: 'public',
          type: 'folder',
          children: [
            {
              id: 'index.html',
              name: 'index.html',
              type: 'file',
              content: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>'
            }
          ]
        },
        {
          id: 'readme.md',
          name: 'README.md',
          type: 'file',
          content: '# Welcome to Your Project\n\n## Features\n\n- Real-time collaboration\n- VS Code-style file explorer\n- Instant sync across all users\n\nStart coding!\n'
        },
        {
          id: 'package.json',
          name: 'package.json',
          type: 'file',
          content: '{\n  "name": "collaborative-project",\n  "version": "1.0.0",\n  "description": "Real-time collaborative coding",\n  "main": "src/index.js"\n}'
        }
      ]
    };

    const testStructurePath = path.join(structuresDir, `${testProjectId}.json`);
    await fs.writeFile(
      testStructurePath,
      JSON.stringify(testStructure, null, 2),
      'utf-8'
    );
    console.log(`✅ Created test project structure: ${testProjectId}`);

    console.log('\n✨ Setup complete!\n');
    console.log('📝 Test project ID:', testProjectId);
    console.log('📁 File structures location:', structuresDir);
    console.log('\n🎉 You can now start using the File Explorer!\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setup();
