#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { load, dump } from 'js-yaml';

function setupPRPreview() {
  const appName = process.argv[2];
  if (!appName) {
    console.error('Usage: node setup-pr-preview.js <app-name>');
    process.exit(1);
  }

  console.log(`Setting up PR preview for app: ${appName}`);

  // Modify fly.toml
  setupFlyToml(appName);
  
  // Modify litefs.yml
  setupLitefsYml();

  console.log('PR preview configuration complete!');
  console.log('✓ App will run in mocks mode with environment variables from .env.example');
}

function setupFlyToml(appName) {
  const flyTomlPath = 'fly.toml';
  const backupPath = 'fly.toml.backup';
  
  console.log('Modifying fly.toml...');
  
  try {
    // Check if source file exists
    if (!fs.existsSync(flyTomlPath)) {
      throw new Error(`Source file ${flyTomlPath} does not exist`);
    }
    
    // Create backup
    fs.copyFileSync(flyTomlPath, backupPath);
    
    // Read and modify fly.toml
    let flyToml = fs.readFileSync(flyTomlPath, 'utf8');
    
    // Update app name
    flyToml = flyToml.replace(/^app = .*/m, `app = "${appName}"`);
    
    // Remove consul from experimental section
    flyToml = flyToml.replace(/^\s*enable_consul = true.*$/m, '');
    
    // Add auto-scaling configuration to services section
    // Find [[services]] section and add auto-scaling after internal_port
    const servicesRegex = /(\[\[services\]\][\s\S]*?internal_port = \d+)/;
    if (servicesRegex.test(flyToml)) {
      flyToml = flyToml.replace(
        servicesRegex,
        `$1
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]`
      );
    }
    
    // Write modified fly.toml
    fs.writeFileSync(flyTomlPath, flyToml);
    console.log('✓ fly.toml updated');
    
  } catch (error) {
    console.error('Error modifying fly.toml:', error.message);
    process.exit(1);
  }
}

function setupLitefsYml() {
  const litefsPath = 'other/litefs.yml';
  const backupPath = 'other/litefs.yml.backup';
  
  console.log('Modifying litefs.yml...');
  
  try {
    // Check if source file exists
    if (!fs.existsSync(litefsPath)) {
      throw new Error(`Source file ${litefsPath} does not exist`);
    }
    
    // Create backup
    fs.copyFileSync(litefsPath, backupPath);
    
    // Read and parse litefs.yml
    const litefsYmlContent = fs.readFileSync(litefsPath, 'utf8');
    const litefsConfig = load(litefsYmlContent);
    
    // Replace the lease section with static lease
    litefsConfig.lease = {
      type: 'static'
    };
    
    // Update the exec section to use mocks mode
    if (litefsConfig.exec && Array.isArray(litefsConfig.exec)) {
      // Find the main startup command (usually the last one)
      const startCommand = litefsConfig.exec.find(cmd => 
        cmd.cmd && (cmd.cmd.includes('npm start') || cmd.cmd.includes('node'))
      );
      
      if (startCommand) {
        startCommand.cmd = 'npm run start:mocks';
        console.log('✓ Updated startup command to use mocks mode');
      } else {
        // If no start command found, add one
        litefsConfig.exec.push({
          cmd: 'npm run start:mocks'
        });
        console.log('✓ Added mocks startup command');
      }
    }
    
    // Convert back to YAML
    let modifiedYml = dump(litefsConfig, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
    
    // Add explanatory comment before the lease section
    modifiedYml = modifiedYml.replace(
      /^lease:/m,
      `# PR Preview: Using static lease type for standalone instance
# This prevents syncing with production data
lease:`
    );
    
    // Write modified litefs.yml
    fs.writeFileSync(litefsPath, modifiedYml);
    console.log('✓ litefs.yml updated');
    
  } catch (error) {
    console.error('Error modifying litefs.yml:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupPRPreview();