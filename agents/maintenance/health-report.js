import fs from 'fs';
import path from 'path';

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const error = (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);

function safeReadJson(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    error(`Failed to read ${filePath}: ${err.message}`);
    return defaultValue;
  }
}

async function generateHealthReport() {
  try {
    log('Generating consolidated health report...');
    
    const dataDir = path.join(process.cwd(), 'data');
    const healthStatsPath = path.join(dataDir, 'health-stats.json');
    
    if (!fs.existsSync(dataDir)) {
      error(`Data directory not found: ${dataDir}`);
      return;
    }
    
    // Read all report files
    const freshnessReport = safeReadJson(
      path.join(dataDir, 'freshness-report.json'),
      {
        totalCourses: 0,
        freshCourses: 0,
        staleCourses: 0,
        freshnessPercent: 0
      }
    );
    
    const linkReport = safeReadJson(
      path.join(dataDir, 'link-report.json'),
      {
        totalLinksFound: 0,
        brokenLinksCount: 0,
        summary: { successRate: 100 }
      }
    );
    
    const codeReport = safeReadJson(
      path.join(dataDir, 'code-validation-report.json'),
      {
        totalCodeBlocksChecked: 0,
        failingBlocksCount: 0,
        validationRate: 100
      }
    );
    
    const sourceReport = safeReadJson(
      path.join(dataDir, 'source-health-report.json'),
      {
        summary: {
          totalSources: 0,
          activeSources: 0,
          degradedSources: 0,
          deadSources: 0,
          healthScore: 100
        }
      }
    );
    
    // Calculate average quality score (weighted)
    const qualityScores = [
      freshnessReport.freshnessPercent || 0,
      linkReport.summary?.successRate || 100,
      codeReport.validationRate || 100,
      sourceReport.summary?.healthScore || 100
    ];
    
    const averageScore = Math.round(
      qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    );
    
    // Generate consolidated report
    const healthStats = {
      generatedAt: new Date().toISOString(),
      
      pipeline: {
        lastDiscovery: null,
        lastGeneration: null,
        lastReview: null,
        lastMaintenance: new Date().toISOString()
      },
      
      content: {
        totalCourses: freshnessReport.totalCourses || 0,
        freshCourses: freshnessReport.freshCourses || 0,
        staleCourses: freshnessReport.staleCourses || 0,
        freshnessPercent: freshnessReport.freshnessPercent || 0
      },
      
      sources: {
        total: sourceReport.summary?.totalSources || 0,
        active: sourceReport.summary?.activeSources || 0,
        degraded: sourceReport.summary?.degradedSources || 0,
        dead: sourceReport.summary?.deadSources || 0
      },
      
      quality: {
        averageScore,
        brokenLinks: linkReport.brokenLinksCount || 0,
        failingCodeSamples: codeReport.failingBlocksCount || 0,
        linkSuccessRate: linkReport.summary?.successRate || 100,
        codeValidationRate: codeReport.validationRate || 100
      },
      
      details: {
        freshness: {
          report: freshnessReport.freshnessPercent || 0,
          threshold: '30 days'
        },
        links: {
          totalChecked: linkReport.totalLinksFound || 0,
          broken: linkReport.brokenLinksCount || 0,
          internalChecked: linkReport.internalLinksChecked || 0,
          externalChecked: linkReport.externalLinksChecked || 0
        },
        code: {
          blocksChecked: codeReport.totalCodeBlocksChecked || 0,
          passing: codeReport.validBlocksCount || 0,
          failing: codeReport.failingBlocksCount || 0,
          supportedLanguages: codeReport.supportedLanguages || []
        }
      },
      
      recommendations: generateRecommendations(
        freshnessReport,
        linkReport,
        codeReport,
        sourceReport
      )
    };
    
    // Write consolidated report
    fs.writeFileSync(healthStatsPath, JSON.stringify(healthStats, null, 2), 'utf8');
    log(`Health stats report written to ${healthStatsPath}`);
    
    // Log summary
    log(`\n${'='.repeat(50)}`);
    log(`HEALTH REPORT SUMMARY`);
    log(`${'='.repeat(50)}`);
    log(`Overall Quality Score: ${healthStats.quality.averageScore}/100`);
    log(`Fresh Courses: ${healthStats.content.freshCourses}/${healthStats.content.totalCourses}`);
    log(`Broken Links: ${healthStats.quality.brokenLinks}`);
    log(`Failing Code Samples: ${healthStats.quality.failingCodeSamples}`);
    log(`Active Sources: ${healthStats.sources.active}/${healthStats.sources.total}`);
    log(`${'='.repeat(50)}\n`);
    
    if (healthStats.recommendations.length > 0) {
      log(`RECOMMENDATIONS:`);
      healthStats.recommendations.forEach((rec, i) => {
        log(`${i + 1}. ${rec}`);
      });
    }
    
    return healthStats;
  } catch (err) {
    error(`Health report generation failed: ${err.message}`);
    throw err;
  }
}

function generateRecommendations(freshnessReport, linkReport, codeReport, sourceReport) {
  const recommendations = [];
  
  // Freshness recommendations
  if (freshnessReport.staleCourses && freshnessReport.staleCourses > 0) {
    const stalePercent = Math.round((freshnessReport.staleCourses / freshnessReport.totalCourses) * 100);
    if (stalePercent > 20) {
      recommendations.push(`${stalePercent}% of courses are stale. Consider regenerating ${freshnessReport.staleCourses} courses.`);
    }
  }
  
  // Link recommendations
  if (linkReport.brokenLinksCount && linkReport.brokenLinksCount > 0) {
    recommendations.push(`Found ${linkReport.brokenLinksCount} broken links. Review and fix link report for details.`);
  }
  
  // Code recommendations
  if (codeReport.failingBlocksCount && codeReport.failingBlocksCount > 0) {
    recommendations.push(`${codeReport.failingBlocksCount} code blocks failed validation. Check code-validation-report for details.`);
  }
  
  // Source recommendations
  if (sourceReport.summary?.deadSources && sourceReport.summary.deadSources > 0) {
    recommendations.push(`${sourceReport.summary.deadSources} sources are dead. Consider archiving or replacing them.`);
  }
  
  if (sourceReport.summary?.degradedSources && sourceReport.summary.degradedSources > 0) {
    recommendations.push(`${sourceReport.summary.degradedSources} sources are degraded. Monitor for reliability issues.`);
  }
  
  // Overall quality recommendations
  const avgScore = (
    (freshnessReport.freshnessPercent || 0) +
    (linkReport.summary?.successRate || 100) +
    (codeReport.validationRate || 100) +
    (sourceReport.summary?.healthScore || 100)
  ) / 4;
  
  if (avgScore < 70) {
    recommendations.push(`Overall quality score (${Math.round(avgScore)}/100) is below 70. Prioritize maintenance tasks.`);
  }
  
  return recommendations;
}

generateHealthReport();
