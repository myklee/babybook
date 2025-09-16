#!/usr/bin/env node

/**
 * Cloudflare Migration Test Script
 * 
 * This script helps test the Cloudflare migration step by step:
 * 1. Test Cloudflare Worker connectivity
 * 2. Test authentication flow
 * 3. Test basic API operations
 * 4. Provide migration status and next steps
 */

import fs from 'fs';

const WORKER_URL = 'https://baby-tracker-api.babybook.workers.dev';

console.log('🚀 Cloudflare Migration Test\n');

// Test 1: Worker connectivity
async function testWorkerConnectivity() {
  console.log('📡 Testing Worker connectivity...');
  
  try {
    const response = await fetch(`${WORKER_URL}/debug`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Worker is responding');
      console.log(`   Environment: ${data.environment || 'unknown'}`);
      console.log(`   Database: ${data.hasDatabase ? 'Connected' : 'Not connected'}`);
      console.log(`   Timestamp: ${data.timestamp}`);
      return true;
    } else {
      console.log('❌ Worker responded with error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Worker connectivity failed:', error.message);
    return false;
  }
}

// Test 2: Authentication
async function testAuthentication() {
  console.log('\n🔐 Testing authentication...');
  
  const testEmail = 'test@example.com';
  const testPassword = 'password123';
  
  try {
    // Test registration
    console.log('   Testing registration...');
    const registerResponse = await fetch(`${WORKER_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    
    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ Registration successful');
      console.log(`   User ID: ${registerData.user?.id}`);
      
      // Test login with the same credentials
      console.log('   Testing login...');
      const loginResponse = await fetch(`${WORKER_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword })
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        console.log(`   Token received: ${loginData.access_token ? 'Yes' : 'No'}`);
        return loginData.access_token;
      } else {
        console.log('❌ Login failed:', loginResponse.status);
        return null;
      }
    } else {
      const error = await registerResponse.json();
      if (error.error === 'User already exists') {
        console.log('ℹ️  User already exists, testing login...');
        
        const loginResponse = await fetch(`${WORKER_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail, password: testPassword })
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          console.log('✅ Login successful');
          return loginData.access_token;
        } else {
          console.log('❌ Login failed:', loginResponse.status);
          return null;
        }
      } else {
        console.log('❌ Registration failed:', error);
        return null;
      }
    }
  } catch (error) {
    console.log('❌ Authentication test failed:', error.message);
    return null;
  }
}

// Test 3: API operations
async function testAPIOperations(token) {
  console.log('\n📊 Testing API operations...');
  
  if (!token) {
    console.log('❌ No token available, skipping API tests');
    return false;
  }
  
  try {
    // Test getting babies
    console.log('   Testing GET /api/babies...');
    const babiesResponse = await fetch(`${WORKER_URL}/api/babies`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (babiesResponse.ok) {
      const babies = await babiesResponse.json();
      console.log('✅ GET babies successful');
      console.log(`   Found ${babies.length} babies`);
    } else {
      console.log('❌ GET babies failed:', babiesResponse.status);
    }
    
    // Test creating a baby
    console.log('   Testing POST /api/babies...');
    const createResponse = await fetch(`${WORKER_URL}/api/babies`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Baby',
        birthdate: new Date().toISOString()
      })
    });
    
    if (createResponse.ok) {
      const baby = await createResponse.json();
      console.log('✅ POST baby successful');
      console.log(`   Created baby: ${baby.name} (ID: ${baby.id})`);
      return true;
    } else {
      console.log('❌ POST baby failed:', createResponse.status);
      const error = await createResponse.text();
      console.log('   Error:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ API operations test failed:', error.message);
    return false;
  }
}

// Migration status check
function checkMigrationStatus() {
  console.log('\n📋 Migration Status Check\n');
  
  // Check if environment files exist
  const hasSupabaseEnv = fs.existsSync('.env');
  const hasCloudflareEnv = fs.existsSync('.env.cloudflare');
  const hasBackup = fs.existsSync('.env.supabase.backup');
  
  console.log('Environment Files:');
  console.log(`   .env (current): ${hasSupabaseEnv ? '✅' : '❌'}`);
  console.log(`   .env.cloudflare: ${hasCloudflareEnv ? '✅' : '❌'}`);
  console.log(`   .env.supabase.backup: ${hasBackup ? '✅' : '❌'}`);
  
  // Check current configuration
  if (hasSupabaseEnv) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const isUsingCloudflare = envContent.includes('VITE_USE_CLOUDFLARE=true');
    
    console.log(`\nCurrent Configuration: ${isUsingCloudflare ? 'Cloudflare' : 'Supabase'}`);
    
    if (isUsingCloudflare) {
      console.log('ℹ️  You are currently configured to use Cloudflare');
    } else {
      console.log('ℹ️  You are currently configured to use Supabase');
    }
  }
}

// Provide next steps
function provideNextSteps(workerOk, authOk, apiOk) {
  console.log('\n🎯 Next Steps\n');
  
  if (!workerOk) {
    console.log('❌ Worker connectivity failed');
    console.log('   → Check if the Cloudflare Worker is deployed');
    console.log('   → Verify the Worker URL is correct');
    console.log('   → Check Cloudflare dashboard for errors');
    return;
  }
  
  if (!authOk) {
    console.log('❌ Authentication failed');
    console.log('   → Check Worker authentication endpoints');
    console.log('   → Verify database connection in Worker');
    console.log('   → Check D1 database schema');
    return;
  }
  
  if (!apiOk) {
    console.log('❌ API operations failed');
    console.log('   → Check Worker API endpoints implementation');
    console.log('   → Verify database queries in Worker');
    console.log('   → Check D1 database permissions');
    return;
  }
  
  console.log('✅ All tests passed! Your Cloudflare infrastructure is ready.');
  console.log('\nTo complete the migration:');
  console.log('1. Switch to Cloudflare configuration:');
  console.log('   cp .env.cloudflare .env');
  console.log('');
  console.log('2. Test your app with Cloudflare:');
  console.log('   npm run dev');
  console.log('');
  console.log('3. If everything works, you can deploy:');
  console.log('   npm run build');
  console.log('');
  console.log('4. To rollback to Supabase:');
  console.log('   cp .env.supabase.backup .env');
  console.log('');
  console.log('💰 Expected savings: $35/month ($420/year)');
}

// Main execution
async function main() {
  const workerOk = await testWorkerConnectivity();
  const token = await testAuthentication();
  const apiOk = await testAPIOperations(token);
  
  checkMigrationStatus();
  provideNextSteps(workerOk, !!token, apiOk);
}

// Run the tests
main().catch(console.error);