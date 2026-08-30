import * as fs from "fs";
import * as path from "path";

const SECRET_DETECTION_PATTERNS = [
  { name: "Private RSA/EC/OPENSSH Key", regex: /-----BEGIN (?:RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----/ },
  { name: "AWS Access Key ID", regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { name: "Google API Key", regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: "GitHub Personal Access Token", regex: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}/ },
  { name: "Live Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24}/ },
  { name: "Slack Token", regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/ },
];

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".turbo",
  ".next",
  "brain",
]);

export interface SecretScanFinding {
  filePath: string;
  lineNumber: number;
  patternName: string;
  matchSnippet: string;
}

export function scanDirectoryForSecrets(dir: string): SecretScanFinding[] {
  const findings: SecretScanFinding[] = [];

  function scan(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) {
          scan(path.join(currentPath, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if ([".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml", ".env"].includes(ext) || entry.name.startsWith(".env")) {
          // Avoid scanning the scanner itself
          if (entry.name === "scan-secrets.ts" || entry.name === "redactor.ts" || entry.name === "redactor.test.ts") {
            continue;
          }

          const fullPath = path.join(currentPath, entry.name);
          const content = fs.readFileSync(fullPath, "utf8");
          const lines = content.split("\n");

          lines.forEach((line, index) => {
            for (const pattern of SECRET_DETECTION_PATTERNS) {
              if (pattern.regex.test(line)) {
                findings.push({
                  filePath: fullPath,
                  lineNumber: index + 1,
                  patternName: pattern.name,
                  matchSnippet: line.trim().slice(0, 60),
                });
              }
            }
          });
        }
      }
    }
  }

  scan(dir);
  return findings;
}

// If run directly via CLI
if (require.main === module) {
  console.log("🔒 Running NexusDesk Automated Secret Scanner...");
  const rootDir = path.resolve(__dirname, "..");
  const findings = scanDirectoryForSecrets(rootDir);

  if (findings.length > 0) {
    console.error(`❌ Found ${findings.length} suspected exposed secrets:`);
    for (const f of findings) {
      console.error(`  - [${f.patternName}] ${f.filePath}:${f.lineNumber} -> ${f.matchSnippet}`);
    }
    process.exit(1);
  } else {
    console.log("✅ Secret scan passed: No exposed private keys or credentials detected.");
    process.exit(0);
  }
}
