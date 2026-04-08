import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const error = (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);

async function checkSourceUrl(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'GitHub-Copilot-LMS/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    return response.status === 200;
  } catch (err) {
    return false;
  }
}

async function updateSourceHealth() {
  try {
    log('Starting source health check...');
    
    const sourcesPath = path.join(process.cwd(), 'data', 'sources.yaml');
    const reportPath = path.join(process.cwd(), 'data', 'source-health-report.json');
    
    if (!fs.existsSync(sourcesPath)) {
      error(`Sources file not found: ${sourcesPath}`);
      return;
    }
    
    const sourcesContent = fs.readFileSync(sourcesPath, 'utf8');
    const sources = yaml.load(sourcesContent);
    
    if (!sources || !Array.isArray(sources.sources)) {
      error('Invalid sources format - expected sources array');
      return;
    }
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const healthReport = [];
    
    let activeCount = 0;
    let degradedCount = 0;
    let deadCount = 0;
    let removedCount = 0;
    
    log(`Checking ${sources.sources.length} sources...`);
    
    // Check each source
    for (const source of sources.sources) {
      log(`Pinging ${source.name} (${source.url})...`);
      
      const isResponsive = await checkSourceUrl(source.url);
      
      if (isResponsive) {
        source.status = 'active';
        source.lastPing = now.toISOString();
        source.failureCount = 0;
        activeCount++;
        log(`  ✓ ${source.name}: Active`);
        
        healthReport.push({
          name: source.name,
          url: source.url,
          status: 'active',
          lastPing: now.toISOString(),
          failureCount: 0
        });
      } else {
        source.failureCount = (source.failureCount || 0) + 1;
        source.lastFailure = now.toISOString();
        
        // Update status based on failure count
        if (source.failureCount >= 7) {
          source.status = 'dead';
          source.deadSince = source.deadSince || now.toISOString();
          deadCount++;
          log(`  ✗ ${source.name}: Dead (${source.failureCount} failures)`);
          
          // Check if dead for 30+ days - remove or archive
          const deadDate = new Date(source.deadSince);
          if (deadDate < thirtyDaysAgo) {
            log(`  🗑️ ${source.name}: Dead for 30+ days, removing from active sources`);
            removedCount++;
            source.archived = true;
            source.archivedDate = now.toISOString();
          }
        } else if (source.failureCount >= 3) {
          source.status = 'degraded';
          degradedCount++;
          log(`  ⚠️ ${source.name}: Degraded (${source.failureCount} failures)`);
        } else {
          source.status = 'responsive';
          log(`  ⚠️ ${source.name}: Responsive but with failures (${source.failureCount}/7)`);
        }
        
        healthReport.push({
          name: source.name,
          url: source.url,
          status: source.status,
          failureCount: source.failureCount,
          lastFailure: source.lastFailure,
          deadSince: source.deadSince || null,
          archived: source.archived || false
        });
      }
    }
    
    // Filter out archived sources from active list but keep them in the file
    const activeSources = sources.sources.filter(s => !s.archived);
    
    // Write updated sources file
    const updatedSources = {
      sources: sources.sources,
      lastUpdated: now.toISOString(),
      summary: {
        total: sources.sources.length,
        active: activeCount,
        degraded: degradedCount,
        dead: deadCount,
        archived: removedCount
      }
    };
    
    const updatedContent = yaml.dump(updatedSources);
    fs.writeFileSync(sourcesPath, updatedContent, 'utf8');
    log(`Updated sources file`);
    
    // Write health report
    const report = {
      generatedAt: now.toISOString(),
      summary: {
        totalSources: sources.sources.length,
        activeSources: activeCount,
        degradedSources: degradedCount,
        deadSources: deadCount,
        archivedSources: removedCount,
        healthScore: Math.round((activeCount / sources.sources.length) * 100)
      },
      sources: healthReport,
      actions: {
        sourcesRemoved: removedCount,
        sourcesMarkedDead: deadCount > 0 ? 'Yes' : 'No'
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    log(`Source health report written to ${reportPath}`);
    log(`Summary: ${activeCount} active, ${degradedCount} degraded, ${deadCount} dead (Health: ${report.summary.healthScore}%)`);
    
    return report;
  } catch (err) {
    error(`Source health check failed: ${err.message}`);
    throw err;
  }
}

updateSourceHealth();
