#!/usr/bin/env node
// Simple ROI analysis script for marketing campaigns (Node ESM, no deps)
// Usage: node scripts/roi_analysis.mjs [path/to/data.csv]
// CSV expected columns: campaign_id,campaign_name,spend,leads,sales,revenue,date

import fs from 'fs';
import readline from 'readline';
import path from 'path';

const fileArg = process.argv[2] || path.join(process.cwd(), 'scripts', 'sample_campaigns.csv');

if (!fs.existsSync(fileArg)) {
  console.error('CSV file not found:', fileArg);
  process.exit(2);
}

async function parseCsv(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers = null;
  const rows = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    // naive CSV split: supports simple CSV without quoted commas
    const cols = line.split(',');
    if (!headers) {
      headers = cols.map(h => h.trim());
      continue;
    }
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (cols[i] ?? '').trim();
    }
    rows.push(obj);
  }
  return rows;
}

function number(v) {
  if (v === undefined || v === null || v === '') return 0;
  // remove anything except digits, dot and minus
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function analyze(rows) {
  const byCampaign = new Map();
  for (const r of rows) {
    const id = r.campaign_id || r.campaign_name || 'unknown';
    const name = r.campaign_name || id;
    const spend = number(r.spend);
    const leads = Math.round(number(r.leads));
    const sales = Math.round(number(r.sales));
    const revenue = number(r.revenue);

    if (!byCampaign.has(id)) {
      byCampaign.set(id, { campaign_id: id, campaign_name: name, spend: 0, leads: 0, sales: 0, revenue: 0 });
    }
    const agg = byCampaign.get(id);
    agg.campaign_name = name;
    agg.spend += spend;
    agg.leads += leads;
    agg.sales += sales;
    agg.revenue += revenue;
  }

  const results = [];
  for (const agg of byCampaign.values()) {
    const cpl = agg.leads > 0 ? agg.spend / agg.leads : null;
    const conversionRate = agg.leads > 0 ? (agg.sales / agg.leads) : null;
    const roi = agg.spend > 0 ? ((agg.revenue - agg.spend) / agg.spend) : null; // e.g., 0.5 == 50%

    results.push({
      ...agg,
      cpl: cpl === null ? null : Number(cpl.toFixed(2)),
      conversion_rate: conversionRate === null ? null : Number((conversionRate * 100).toFixed(2)),
      roi: roi === null ? null : Number((roi * 100).toFixed(2)),
    });
  }

  return results;
}

function printReport(results, top = 10) {
  if (!results.length) {
    console.log('No campaigns found in dataset.');
    return;
  }

  console.log('\nTop campaigns by ROI (ROI %):');
  const byRoi = results.slice().filter(r => r.roi !== null).sort((a, b) => b.roi - a.roi);
  for (const row of byRoi.slice(0, top)) {
    console.log(`- ${row.campaign_name} (id=${row.campaign_id}): ROI=${row.roi}% | Spend=${row.spend} | Revenue=${row.revenue} | Leads=${row.leads} | Sales=${row.sales} | CPL=${row.cpl}`);
  }

  console.log('\nTop campaigns by Leads:');
  const byLeads = results.slice().sort((a, b) => b.leads - a.leads);
  for (const row of byLeads.slice(0, top)) {
    console.log(`- ${row.campaign_name} (id=${row.campaign_id}): Leads=${row.leads} | Spend=${row.spend} | Revenue=${row.revenue} | ROI=${row.roi}% | CPL=${row.cpl}`);
  }

  console.log('\nFull table (JSON):');
  console.log(JSON.stringify(results, null, 2));
}

(async function main(){
  try {
    const rows = await parseCsv(fileArg);
    const results = analyze(rows);
    printReport(results, 10);
  } catch (err) {
    console.error('Error processing CSV:', err);
    process.exit(3);
  }
})();
