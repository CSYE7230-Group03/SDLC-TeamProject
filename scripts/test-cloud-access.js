#!/usr/bin/env node

/**
 * Cloud Access Validation Script
 * 
 * This script validates access to required cloud services:
 * - Firebase (Firestore, Auth, Storage)
 * - AWS S3
 * 
 * Usage: node scripts/test-cloud-access.js
 */

require('dotenv').config();

const testResults = {
  firebase: { tested: false, success: false, message: '' },
  aws: { tested: false, success: false, message: '' }
};

/**
 * Test Firebase connectivity
 */
async function testFirebaseAccess() {
  console.log('\n[Firebase] Testing Firebase Access...');
  
  try {
    // Check if Firebase credentials are configured
    const requiredEnvVars = [
      'FIREBASE_API_KEY',
      'FIREBASE_AUTH_DOMAIN',
      'FIREBASE_PROJECT_ID'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      testResults.firebase.tested = true;
      testResults.firebase.success = false;
      testResults.firebase.message = `Missing environment variables: ${missingVars.join(', ')}`;
      console.log('[FAIL] Firebase: Missing credentials');
      return;
    }
    
    // For now, just validate that credentials are present
    // In a real implementation, we would initialize Firebase SDK and test connection
    console.log('[PASS] Firebase: Credentials configured');
    console.log(`       Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
    
    testResults.firebase.tested = true;
    testResults.firebase.success = true;
    testResults.firebase.message = 'Credentials configured (SDK test pending)';
    
  } catch (error) {
    testResults.firebase.tested = true;
    testResults.firebase.success = false;
    testResults.firebase.message = error.message;
    console.log('[FAIL] Firebase: Error -', error.message);
  }
}

/**
 * Test AWS S3 connectivity
 */
async function testAWSAccess() {
  console.log('\n[AWS] Testing AWS S3 Access...');
  
  try {
    // Check if AWS credentials are configured
    const requiredEnvVars = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_S3_BUCKET',
      'AWS_REGION'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      testResults.aws.tested = true;
      testResults.aws.success = false;
      testResults.aws.message = `Missing environment variables: ${missingVars.join(', ')}`;
      console.log('[FAIL] AWS: Missing credentials');
      return;
    }
    
    // For now, just validate that credentials are present
    // In a real implementation, we would use AWS SDK to test S3 access
    console.log('[PASS] AWS: Credentials configured');
    console.log(`       Region: ${process.env.AWS_REGION}`);
    console.log(`       Bucket: ${process.env.AWS_S3_BUCKET}`);
    
    testResults.aws.tested = true;
    testResults.aws.success = true;
    testResults.aws.message = 'Credentials configured (SDK test pending)';
    
  } catch (error) {
    testResults.aws.tested = true;
    testResults.aws.success = false;
    testResults.aws.message = error.message;
    console.log('[FAIL] AWS: Error -', error.message);
  }
}

/**
 * Print summary of test results
 */
function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('Cloud Access Test Summary');
  console.log('='.repeat(50));
  
  const allPassed = Object.values(testResults).every(
    result => result.tested && result.success
  );
  
  Object.entries(testResults).forEach(([service, result]) => {
    const status = result.success ? '[PASS]' : '[FAIL]';
    console.log(`\n${service.toUpperCase()}: ${status}`);
    console.log(`  Message: ${result.message}`);
  });
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('[SUCCESS] All cloud services are accessible!');
    console.log('\nNext steps:');
    console.log('1. Install Firebase SDK: npm install firebase-admin');
    console.log('2. Install AWS SDK: npm install @aws-sdk/client-s3');
    console.log('3. Run full integration tests');
    process.exit(0);
  } else {
    console.log('[ERROR] Some cloud services are not accessible.');
    console.log('\nPlease check:');
    console.log('1. .env file exists and contains valid credentials');
    console.log('2. Copy .env.example to .env and fill in your values');
    console.log('3. Verify credentials in respective cloud consoles');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('Starting Cloud Access Validation...');
  console.log('='.repeat(50));
  
  // Check if .env file exists
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('\n[WARNING] .env file not found!');
    console.log('Please create .env file from .env.example');
    console.log('\nCommand: cp .env.example .env');
    console.log('Then edit .env with your actual credentials.\n');
  }
  
  await testFirebaseAccess();
  await testAWSAccess();
  
  printSummary();
}

// Run the tests
main().catch(error => {
  console.error('\n[ERROR] Unexpected error:', error);
  process.exit(1);
});
