import fs from 'fs';
import path from 'path';

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const error = (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);

// Regex to find markdown links and raw URLs
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const URL_REGEX = /https?:\/\/[^\s)]+/g;

async function checkUrl(url, timeout = 5000) {
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

function findFileLinks(content, filePath) {
  const links = [];
  let lineNum = 1;
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    lineNum = index + 1;
    
    // Find markdown links
    let mdMatch;
    while ((mdMatch = MARKDOWN_LINK_REGEX.exec(line)) !== null) {
      const url = mdMatch[2];
      if (url && !url.startsWith('#')) { // Ignore anchors
        links.push({
          url,
          type: 'markdown',
          line: lineNum,
          file: filePath
        });
      }
    }
    
    // Find raw URLs
    let urlMatch;
    while ((urlMatch = URL_REGEX.exec(line)) !== null) {
      const url = urlMatch[0];
      links.push({
        url,
        type: 'raw',
        line: lineNum,
        file: filePath
      });
    }
  });
  
  return links;
}

async function checkBrokenLinks() {
  try {
    log('Starting broken link check...');
    
    const coursesDir = path.join(process.cwd(), 'src', 'content', 'courses');
    const reportPath = path.join(process.cwd(), 'data', 'link-report.json');
    
    if (!fs.existsSync(coursesDir)) {
      error(`Courses directory not found: ${coursesDir}`);
      return;
    }
    
    const brokenLinks = [];
    let totalLinksChecked = 0;
    let internalLinksChecked = 0;
    let externalLinksChecked = 0;
    let brokenCount = 0;
    
    // Recursively scan for markdown files
    function scanDirectory(dir) {
      const files = fs.readdirSync(dir);
      
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
          log(`Scanning ${path.relative(coursesDir, filePath)}...`);
          
          const content = fs.readFileSync(filePath, 'utf8');
          const links = findFileLinks(content, path.relative(process.cwd(), filePath));
          
          links.forEach(async (linkObj) => {
            totalLinksChecked++;
            const { url, type, line, file } = linkObj;
            
            // Check if internal link
            if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
              internalLinksChecked++;
              const targetPath = url.startsWith('/')
                ? path.join(process.cwd(), url)
                : path.normalize(path.join(path.dirname(filePath), url));
              
              if (!fs.existsSync(targetPath)) {
                log(`  ✗ BROKEN INTERNAL LINK: ${url} at ${file}:${line}`);
                brokenLinks.push({
                  url,
                  type: 'internal',
                  file,
                  line,
                  status: 'not_found'
                });
                brokenCount++;
              }
            } else if (url.startsWith('http')) {
              externalLinksChecked++;
              const isAlive = await checkUrl(url);
              
              if (!isAlive) {
                log(`  ✗ BROKEN EXTERNAL LINK: ${url} at ${file}:${line}`);
                brokenLinks.push({
                  url,
                  type: 'external',
                  file,
                  line,
                  status: 'unreachable'
                });
                brokenCount++;
              }
            }
          });
        }
      });
    }
    
    scanDirectory(coursesDir);
    
    // Write report
    const report = {
      generatedAt: new Date().toISOString(),
      totalLinksFound: totalLinksChecked,
      internalLinksChecked,
      externalLinksChecked,
      brokenLinksCount: brokenCount,
      brokenLinks,
      summary: {
        allValid: brokenCount === 0,
        brokenCount,
        successRate: totalLinksChecked > 0 
          ? Math.round(((totalLinksChecked - brokenCount) / totalLinksChecked) * 100)
          : 100
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    log(`Link check report written to ${reportPath}`);
    log(`Summary: ${totalLinksChecked} links checked, ${brokenCount} broken`);
    
    return report;
  } catch (err) {
    error(`Link check failed: ${err.message}`);
    throw err;
  }
}

checkBrokenLinks();
