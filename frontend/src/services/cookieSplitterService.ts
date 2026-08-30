/**
 * OceanForge Roblox Cookie Extractor & Splitter Service
 * ═════════════════════════════════════════════════════
 * High-performance parser and extractor for Roblox .ROBLOSECURITY cookies.
 * Handles combos (user:pass:cookie, user|pass|cookie, CSV, JSON, Netscape, HTTP Headers),
 * sanity checking, deduplication, and multi-format conversion.
 */

export interface ParsedCookieItem {
  id: string;
  originalLine: string;
  username: string;
  password?: string;
  cookie: string;
  cleanCookie: string; // purely _|WARNING:...
  withPrefixCookie: string; // .ROBLOSECURITY=_|WARNING:...
  isValid: boolean;
  validationStatus: 'VALID' | 'WARNING_NO_HEADER' | 'INVALID_TOO_SHORT' | 'INVALID_FORMAT';
  validationMessage: string;
  isDuplicate: boolean;
  length: number;
  extraMeta?: Record<string, any>;
}

export interface SplitterStats {
  totalLines: number;
  totalFound: number;
  validCount: number;
  warningCount: number;
  invalidCount: number;
  duplicateCount: number;
  uniqueCount: number;
  combosCount: number; // Has both username and cookie
  hasPasswordCount: number;
}

export interface ParseOptions {
  delimiter?: 'auto' | ':' | '|' | ';' | ',' | '\t';
  removeDuplicates?: boolean;
  filterValidOnly?: boolean;
  stripPrefix?: boolean; // Strip .ROBLOSECURITY=
  autoDetectUsername?: boolean;
}

export type OutputFormat =
  | 'PURE_COOKIE'
  | 'COOKIE_WITH_PREFIX'
  | 'USER_PASS_COOKIE'
  | 'USER_COOKIE'
  | 'JSON_ARRAY'
  | 'PYTHON_LIST'
  | 'LUA_TABLE'
  | 'NETSCAPE_HTTP'
  | 'CSV_FORMAT';

// Roblox Cookie Regex Patterns
const ROBLOSECURITY_STRICT_REGEX = /(_\|WARNING:[^\s"'<>]+)/i;
const ROBLOSECURITY_HEADER_REGEX = /\.ROBLOSECURITY\s*=\s*(_\|WARNING:[^\s"'<>]+|[a-zA-Z0-9_\-~]{500,})/i;
const ROBLOSECURITY_GENERIC_LONG_REGEX = /(_\|WARNING:[^\s"'<>]+|(?<![a-zA-Z0-9_\-])[a-zA-Z0-9_\-]{500,}(?![a-zA-Z0-9_\-]))/i;

export class CookieSplitterService {
  /**
   * Cleans a raw cookie token (removes spaces, surrounding quotes, escapes, prefix)
   */
  public static sanitizeCookie(raw: string): string {
    if (!raw) return '';
    let clean = raw.trim();

    // Strip wrapping quotes
    clean = clean.replace(/^["'`]|["'`]$/g, '');

    // Strip .ROBLOSECURITY= prefix if present
    clean = clean.replace(/^\.ROBLOSECURITY\s*=\s*/i, '');
    clean = clean.replace(/^ROBLOSECURITY\s*=\s*/i, '');

    // Strip trailing semicolons or commas
    clean = clean.replace(/[;,]+$/, '').trim();

    return clean;
  }

  /**
   * Validates a Roblox cookie string and returns its status
   */
  public static validateCookie(cookie: string): {
    isValid: boolean;
    status: ParsedCookieItem['validationStatus'];
    message: string;
  } {
    const clean = this.sanitizeCookie(cookie);

    if (!clean || clean.length < 50) {
      return {
        isValid: false,
        status: 'INVALID_TOO_SHORT',
        message: 'Cookie quá ngắn hoặc trống'
      };
    }

    const hasWarningHeader = clean.includes('_|WARNING:-DO-NOT-SHARE-THIS') || clean.includes('_|WARNING:');

    if (clean.length < 400 && !hasWarningHeader) {
      return {
        isValid: false,
        status: 'INVALID_TOO_SHORT',
        message: `Độ dài không đủ (${clean.length} ký tự, tối thiểu 600 ký tự)`
      };
    }

    if (!hasWarningHeader && clean.length >= 600) {
      return {
        isValid: true,
        status: 'WARNING_NO_HEADER',
        message: 'Hợp lệ nhưng thiếu Header cảnh báo tiêu chuẩn'
      };
    }

    if (hasWarningHeader && clean.length < 300) {
      return {
        isValid: false,
        status: 'INVALID_TOO_SHORT',
        message: 'Chứa Header cảnh báo nhưng bị cắt cụt'
      };
    }

    return {
      isValid: true,
      status: 'VALID',
      message: 'Định dạng .ROBLOSECURITY hợp lệ'
    };
  }

  /**
   * Core parsing method: splits text lines and extracts accounts and cookies
   */
  public static parse(rawText: string, options: ParseOptions = {}): {
    items: ParsedCookieItem[];
    stats: SplitterStats;
  } {
    if (!rawText || !rawText.trim()) {
      return {
        items: [],
        stats: {
          totalLines: 0,
          totalFound: 0,
          validCount: 0,
          warningCount: 0,
          invalidCount: 0,
          duplicateCount: 0,
          uniqueCount: 0,
          combosCount: 0,
          hasPasswordCount: 0
        }
      };
    }

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const seenCookies = new Set<string>();
    const items: ParsedCookieItem[] = [];

    let totalFound = 0;
    let validCount = 0;
    let warningCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let combosCount = 0;
    let hasPasswordCount = 0;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const parsedItem = this.parseSingleLine(line, index, options);

      if (parsedItem) {
        totalFound++;

        // Deduplication check
        const normalizedCookie = parsedItem.cleanCookie;
        if (seenCookies.has(normalizedCookie)) {
          parsedItem.isDuplicate = true;
          duplicateCount++;
        } else {
          seenCookies.add(normalizedCookie);
        }

        if (parsedItem.validationStatus === 'VALID') {
          validCount++;
        } else if (parsedItem.validationStatus === 'WARNING_NO_HEADER') {
          warningCount++;
        } else {
          invalidCount++;
        }

        if (parsedItem.username) {
          combosCount++;
        }
        if (parsedItem.password) {
          hasPasswordCount++;
        }

        // Filter options
        if (options.removeDuplicates && parsedItem.isDuplicate) {
          continue;
        }
        if (options.filterValidOnly && !parsedItem.isValid) {
          continue;
        }

        items.push(parsedItem);
      }
    }

    const stats: SplitterStats = {
      totalLines: lines.length,
      totalFound,
      validCount,
      warningCount,
      invalidCount,
      duplicateCount,
      uniqueCount: seenCookies.size,
      combosCount,
      hasPasswordCount
    };

    return { items, stats };
  }

  /**
   * Parses an individual line into a structured account item
   */
  private static parseSingleLine(line: string, index: number, options: ParseOptions): ParsedCookieItem | null {
    let username = '';
    let password = '';
    let rawCookie = '';

    // 1. Check if line is a JSON format object
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const json = JSON.parse(line);
        rawCookie = json.cookie || json.robloxSecurity || json['.ROBLOSECURITY'] || json.token || '';
        username = json.username || json.user || json.account || json.name || '';
        password = json.password || json.pass || '';
      } catch {
        // Fallback to text parsing
      }
    }

    // 2. Check if line is Netscape HTTP Cookie format
    // e.g. .roblox.com  TRUE  /  FALSE  1799999999  .ROBLOSECURITY  _|WARNING...
    if (!rawCookie && line.includes('.roblox.com') && line.includes('.ROBLOSECURITY')) {
      const parts = line.split(/\s+/);
      const cookieIdx = parts.findIndex((p) => p === '.ROBLOSECURITY');
      if (cookieIdx !== -1 && parts[cookieIdx + 1]) {
        rawCookie = parts[cookieIdx + 1];
      }
    }

    // 3. Find the exact boundary of the Roblox cookie in the line
    if (!rawCookie) {
      // Find cookie match
      const cookieMatch = line.match(/(?:\.ROBLOSECURITY\s*=\s*)?(_\|WARNING:[^\s"'<>]+|(?<![a-zA-Z0-9_\-])[a-zA-Z0-9_\-]{500,})/i);
      if (cookieMatch && typeof cookieMatch.index === 'number') {
        rawCookie = cookieMatch[1];

        // The substring before the cookie is the credentials prefix (e.g. "CaptainDragon_VN:StrongPass2026!:")
        const prefix = line.substring(0, cookieMatch.index).trim().replace(/[:|;,\t]+$/, '');
        if (prefix && !prefix.startsWith('Cookie:') && !prefix.startsWith('#')) {
          let sep = ':';
          if (options.delimiter && options.delimiter !== 'auto') {
            sep = options.delimiter;
          } else if (prefix.includes('|')) {
            sep = '|';
          } else if (prefix.includes('\t')) {
            sep = '\t';
          } else if (prefix.includes(';')) {
            sep = ';';
          } else if (prefix.includes(',') && !prefix.includes('{"')) {
            sep = ',';
          }

          const prefixParts = prefix.split(sep);
          if (prefixParts.length >= 2) {
            username = prefixParts[0].trim();
            password = prefixParts.slice(1).join(sep).trim();
          } else if (prefixParts.length === 1) {
            username = prefixParts[0].trim();
          }
        }
      }
    }

    // If still no cookie found, this line cannot be extracted
    if (!rawCookie) {
      return null;
    }

    const cleanCookie = this.sanitizeCookie(rawCookie);
    const withPrefixCookie = `.ROBLOSECURITY=${cleanCookie}`;
    const validation = this.validateCookie(cleanCookie);

    // If username is empty, attempt to extract it from context or placeholder
    if (!username) {
      // Check if username was specified in key=value format (e.g. user=abc cookie=xyz)
      const userMatch = line.match(/(?:username|user|acc|account|name)=([^\s,:;|]+)/i);
      if (userMatch) {
        username = userMatch[1].trim();
      }
    }

    // Clean up username and password if extracted
    username = username.replace(/^["'`]|["'`]$/g, '').trim();
    password = password.replace(/^["'`]|["'`]$/g, '').trim();

    return {
      id: `cookie_${index}_${Math.random().toString(36).substring(2, 7)}`,
      originalLine: line,
      username: username || (validation.isValid ? `FleetAcc_${index + 1}` : ''),
      password,
      cookie: rawCookie,
      cleanCookie,
      withPrefixCookie,
      isValid: validation.isValid,
      validationStatus: validation.status,
      validationMessage: validation.message,
      isDuplicate: false,
      length: cleanCookie.length
    };
  }

  /**
   * Converts parsed items to various output formats
   */
  public static formatOutput(items: ParsedCookieItem[], format: OutputFormat): string {
    if (!items || items.length === 0) return '';

    switch (format) {
      case 'PURE_COOKIE':
        return items.map((item) => item.cleanCookie).join('\n');

      case 'COOKIE_WITH_PREFIX':
        return items.map((item) => item.withPrefixCookie).join('\n');

      case 'USER_PASS_COOKIE':
        return items
          .map((item) => {
            const u = item.username || 'unknown';
            const p = item.password || '';
            return `${u}:${p}:${item.cleanCookie}`;
          })
          .join('\n');

      case 'USER_COOKIE':
        return items
          .map((item) => {
            const u = item.username || 'unknown';
            return `${u}:${item.cleanCookie}`;
          })
          .join('\n');

      case 'JSON_ARRAY':
        const jsonList = items.map((item) => ({
          username: item.username,
          password: item.password || undefined,
          cookie: item.cleanCookie,
          length: item.length,
          isValid: item.isValid,
          status: item.validationStatus
        }));
        return JSON.stringify(jsonList, null, 2);

      case 'PYTHON_LIST':
        const pyItems = items.map((item) => `    "${item.cleanCookie}"`).join(',\n');
        return `# Generated by OceanForge Roblox Cookie Extractor\n# Total: ${items.length} accounts\n\nROBLOX_COOKIES = [\n${pyItems}\n]\n\n# Combos Dictionary\nROBLOX_ACCOUNTS = [\n${items
          .map(
            (item) =>
              `    {"username": "${item.username || ''}", "password": "${item.password || ''}", "cookie": "${item.cleanCookie}"}`
          )
          .join(',\n')}\n]`;

      case 'LUA_TABLE':
        const luaItems = items.map((item) => `    "${item.cleanCookie}"`).join(',\n');
        return `-- Generated by OceanForge Roblox Cookie Extractor\n-- Total: ${items.length} accounts\n\nlocal FleetCookies = {\n${luaItems}\n}\n\nreturn FleetCookies`;

      case 'NETSCAPE_HTTP':
        const header =
          '# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This file was generated by OceanForge\n\n';
        const netscapeLines = items
          .map((item) => {
            const expiry = Math.floor(Date.now() / 1000) + 31536000 * 2; // +2 years
            return `.roblox.com\tTRUE\t/\tTRUE\t${expiry}\t.ROBLOSECURITY\t${item.cleanCookie}`;
          })
          .join('\n');
        return header + netscapeLines;

      case 'CSV_FORMAT':
        const csvHeader = 'Username,Password,Cookie,Length,Status,IsValid\n';
        const csvRows = items
          .map((item) => {
            const u = `"${(item.username || '').replace(/"/g, '""')}"`;
            const p = `"${(item.password || '').replace(/"/g, '""')}"`;
            const c = `"${(item.cleanCookie || '').replace(/"/g, '""')}"`;
            return `${u},${p},${c},${item.length},${item.validationStatus},${item.isValid}`;
          })
          .join('\n');
        return csvHeader + csvRows;

      default:
        return items.map((item) => item.cleanCookie).join('\n');
    }
  }

  /**
   * Generates a sample dump containing multiple chaotic formats for instant demonstration
   */
  public static getSampleDump(): string {
    const sampleHash1 = '78A29BD0E3F4C118A948C9E763B1238490AFBCDE1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF';
    const sampleHash2 = '99F12A80BC34DE6781290384756192837465928374659283746592837465928374659283746592837465928374659283746592837465928374659283746592837465928374659283746592837465928374659283746592837465928374659283746592837465928374659283746592837465928374659283746592837465928374659283746592837465928374659283746592837465';
    const sampleHash3 = '55A88B33CC11DD22EE77FF44AA99BB887766554433221100FFEEDDCCBBAA99887766554433221100FFEEDDCCBBAA99887766554433221100FFEEDDCCBBAA99887766554433221100FFEEDDCCBBAA99887766554433221100FFEEDDCCBBAA99887766554433221100FFEEDDCCBBAA99887766554433221100FFEEDDCCBBAA99887766554433221100FFEEDDCCBBAA9988';

    return [
      `# ─── 1. Định dạng User:Pass:Cookie chuẩn ───`,
      `CaptainDragon_VN:StrongPass2026!:_|WARNING:-DO-NOT-SHARE-THIS.--${sampleHash1}`,
      `SeaHunter_Pro:BeliHunter999@:_|WARNING:-DO-NOT-SHARE-THIS.--${sampleHash2}`,
      ``,
      `# ─── 2. Định dạng Delimiter Pipe (|) & Semicolon (;) ───`,
      `PirateKing_VN|P@ssword2026|_|WARNING:-DO-NOT-SHARE-THIS.--${sampleHash3}`,
      `BountyMaster;SecretPass123;.ROBLOSECURITY=_|WARNING:-DO-NOT-SHARE-THIS.--${sampleHash1}`,
      ``,
      `# ─── 3. Định dạng Browser HTTP Header / cURL ───`,
      `Cookie: _ga=GA1.2.123456789; .ROBLOSECURITY=_|WARNING:-DO-NOT-SHARE-THIS.--${sampleHash2}; RBXEventTrackerV2=xyz`,
      ``,
      `# ─── 4. Định dạng Netscape Cookie File ───`,
      `.roblox.com\tTRUE\t/\tTRUE\t1799999999\t.ROBLOSECURITY\t_|WARNING:-DO-NOT-SHARE-THIS.--${sampleHash3}`,
      ``,
      `# ─── 5. Định dạng JSON Object ───`,
      `{"username": "RobloxGod_77", "password": "GodPassword!", "cookie": "_|WARNING:-DO-NOT-SHARE-THIS.--${sampleHash1}"}`,
      ``,
      `# ─── 6. Cookie thô dán lẫn văn bản ───`,
      `Nick phụ cày tiền Blox Fruits: _|WARNING:-DO-NOT-SHARE-THIS.--${sampleHash2} (level 2550 max)`,
      `Acc này bị trùng: _|WARNING:-DO-NOT-SHARE-THIS.--${sampleHash1}`
    ].join('\n');
  }
}

export const cookieSplitter = CookieSplitterService;
