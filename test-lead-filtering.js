#!/usr/bin/env node

// Test script for lead filtering by assignedTo using Assignment entity
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

async function testLeadFiltering() {
  console.log('🔍 Testing lead filtering by assignedTo...\n');

  try {
    // 1. Login to get token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData);
      return;
    }

    console.log('✅ Login successful!');
    const token = loginData.access_token;

    // 2. Get managers to use for filtering
    console.log('\n2. Getting managers...');
    const managersResponse = await fetch(`${API_URL}/users/managers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const managers = await managersResponse.json();

    if (!managersResponse.ok || !managers.length) {
      console.error('❌ Failed to get managers:', managers);
      return;
    }

    console.log(`✅ Found ${managers.length} managers`);
    const firstManager = managers[0];
    console.log(`📋 Using manager: ${firstManager.username} (ID: ${firstManager.id})`);

    // 3. Create a test lead and assign it to the manager
    console.log('\n3. Creating and assigning test lead...');
    const leadData = {
      name: `Test Lead for Filtering ${new Date().toISOString()}`,
      email: `test-filter-${Date.now()}@example.com`,
      phone: '+7-999-999-99-99',
      source: 'website',
      priority: 'high'
    };

    const createLeadResponse = await fetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(leadData)
    });

    const createdLead = await createLeadResponse.json();

    if (!createLeadResponse.ok) {
      console.error('❌ Failed to create lead:', createdLead);
      return;
    }

    console.log(`✅ Created lead: ${createdLead.name} (ID: ${createdLead.id})`);

    // Assign the lead to the manager
    const assignResponse = await fetch(`${API_URL}/leads/${createdLead.id}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ user: firstManager.id.toString() })
    });

    const assignResult = await assignResponse.json();

    if (!assignResponse.ok) {
      console.error('❌ Failed to assign lead:', assignResult);
      return;
    }

    console.log(`✅ Assigned lead to manager: ${firstManager.username}`);

    // 4. Test filtering by assignedTo
    console.log('\n4. Testing lead filtering by assignedTo...');

    // Filter by the specific manager
    const filterResponse = await fetch(`${API_URL}/leads?assignedTo=${firstManager.id}&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const filterResult = await filterResponse.json();

    if (!filterResponse.ok) {
      console.error('❌ Failed to filter leads:', filterResult);
      return;
    }

    console.log(`✅ Filter request successful!`);
    console.log(`📊 Total leads found: ${filterResult.total}`);
    console.log(`📄 Leads returned: ${filterResult.leads.length}`);

    // Check if our assigned lead is in the results
    const assignedLeadInResults = filterResult.leads.find(lead => lead.id === createdLead.id);

    if (assignedLeadInResults) {
      console.log('✅ Assigned lead found in filtered results!');
      console.log(`👤 Lead assigned to: ${assignedLeadInResults.assignedTo || 'N/A (using Assignment entity)'}`);
    } else {
      console.log('❌ Assigned lead NOT found in filtered results');
      console.log('🔍 Checking all returned leads:');
      filterResult.leads.forEach((lead, index) => {
        console.log(`   ${index + 1}. ${lead.name} (ID: ${lead.id})`);
      });
    }

    // 5. Test filtering by multiple managers
    if (managers.length > 1) {
      console.log('\n5. Testing filtering by multiple managers...');
      const secondManager = managers[1];
      const multiFilterResponse = await fetch(`${API_URL}/leads?assignedTo=${firstManager.id}&assignedTo=${secondManager.id}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const multiFilterResult = await multiFilterResponse.json();

      if (!multiFilterResponse.ok) {
        console.error('❌ Failed to filter by multiple managers:', multiFilterResult);
        return;
      }

      console.log(`✅ Multi-manager filter successful!`);
      console.log(`📊 Total leads found: ${multiFilterResult.total}`);
    }

    // 6. Test statistics filtering
    console.log('\n6. Testing statistics with assignedTo filter...');
    const statsResponse = await fetch(`${API_URL}/leads/statistics?assignedTo=${firstManager.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const statsResult = await statsResponse.json();

    if (!statsResponse.ok) {
      console.error('❌ Failed to get statistics:', statsResult);
      return;
    }

    console.log('✅ Statistics request successful!');
    console.log(`📊 Total leads in stats: ${statsResult.total}`);
    console.log(`📈 Average score: ${statsResult.averageScore}`);
    console.log(`💰 Total estimated value: ${statsResult.totalEstimatedValue}`);

    // 7. Clean up - delete the test lead
    console.log('\n7. Cleaning up test data...');
    const deleteResponse = await fetch(`${API_URL}/leads/${createdLead.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (deleteResponse.ok) {
      console.log('✅ Test lead deleted successfully');
    } else {
      console.log('⚠️  Failed to delete test lead, but test completed');
    }

    console.log('\n🎉 Lead filtering test completed successfully!');

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Check if node-fetch is available
try {
  require('node-fetch');
  testLeadFiltering();
} catch (error) {
  console.log('❌ node-fetch not installed. Install with: npm install node-fetch@2');
  console.log('Or use built-in fetch in newer Node.js versions');
}