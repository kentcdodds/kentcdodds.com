#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
}

function setupFlyToml(appName) {
  const flyTomlPath = 'fly.toml';
  const backupPath = 'fly.toml.backup';
  
  console.log('Modifying fly.toml...');
  
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
}

function setupLitefsYml() {
  const litefsPath = 'other/litefs.yml';
  const backupPath = 'other/litefs.yml.backup';
  
  console.log('Modifying litefs.yml...');
  
  // Create backup
  fs.copyFileSync(litefsPath, backupPath);
  
  // Read litefs.yml
  let litefsYml = fs.readFileSync(litefsPath, 'utf8');
  
  // Replace the lease section with static lease
  // Find the lease section and replace it with static configuration
  const leaseRegex = /^lease:[\s\S]*?(?=^exec:)/m;
  const staticLeaseConfig = `lease:
  type: 'static'

`;
  
  litefsYml = litefsYml.replace(leaseRegex, staticLeaseConfig);
  
  // Add explanatory comment before the lease section
  litefsYml = litefsYml.replace(
    /^lease:/m,
    `# PR Preview: Using static lease type for standalone instance
# This prevents syncing with production data
lease:`
  );
  
  // Write modified litefs.yml
  fs.writeFileSync(litefsPath, litefsYml);
  console.log('✓ litefs.yml updated');
}

// Run the setup
setupPRPreview();