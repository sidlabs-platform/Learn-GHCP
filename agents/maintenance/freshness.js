import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const error = (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);

async function auditFreshness() {
  try {
    log('Starting freshness audit...');
    
    const catalogPath = path.join(process.cwd(), 'data', 'catalog.yaml');
    const reportPath = path.join(process.cwd(), 'data', 'freshness-report.json');
    
    // Read catalog
    if (!fs.existsSync(catalogPath)) {
      error(`Catalog file not found: ${catalogPath}`);
      return;
    }
    
    const catalogContent = fs.readFileSync(catalogPath, 'utf8');
    const catalog = yaml.load(catalogContent);
    
    if (!catalog || !Array.isArray(catalog.courses)) {
      error('Invalid catalog format - expected courses array');
      return;
    }
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const staleCourses = [];
    let freshCount = 0;
    
    log(`Checking ${catalog.courses.length} courses for freshness...`);
    
    catalog.courses.forEach((course) => {
      const lastVerified = course.lastVerified ? new Date(course.lastVerified) : null;
      
      if (!lastVerified) {
        log(`  ⚠️  ${course.id}: Never verified`);
        staleCourses.push({
          id: course.id,
          title: course.title,
          lastVerified: null,
          status: 'never_verified',
          daysStale: null
        });
      } else if (lastVerified < thirtyDaysAgo) {
        const daysStale = Math.floor((now - lastVerified) / (24 * 60 * 60 * 1000));
        log(`  ⚠️  ${course.id}: Stale for ${daysStale} days (last verified: ${lastVerified.toISOString()})`);
        staleCourses.push({
          id: course.id,
          title: course.title,
          lastVerified: lastVerified.toISOString(),
          status: 'stale',
          daysStale
        });
      } else {
        freshCount++;
        course.freshnessStatus = 'fresh';
        log(`  ✓ ${course.id}: Fresh (verified ${Math.floor((now - lastVerified) / (24 * 60 * 60 * 1000))} days ago)`);
      }
    });
    
    // Update catalog with freshness status
    catalog.courses.forEach((course) => {
      if (!course.freshnessStatus) {
        course.freshnessStatus = 'stale';
      }
    });
    
    // Write updated catalog
    const updatedCatalogContent = yaml.dump(catalog);
    fs.writeFileSync(catalogPath, updatedCatalogContent, 'utf8');
    log(`Updated catalog with freshness status`);
    
    // Write report
    const report = {
      generatedAt: now.toISOString(),
      totalCourses: catalog.courses.length,
      freshCourses: freshCount,
      staleCourses: staleCourses.length,
      freshnessPercent: Math.round((freshCount / catalog.courses.length) * 100),
      staleCoursesList: staleCourses,
      threshold: '30 days'
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    log(`Freshness report written to ${reportPath}`);
    log(`Summary: ${freshCount}/${catalog.courses.length} courses are fresh (${report.freshnessPercent}%)`);
    
    return report;
  } catch (err) {
    error(`Freshness audit failed: ${err.message}`);
    throw err;
  }
}

auditFreshness();
