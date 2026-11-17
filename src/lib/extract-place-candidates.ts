const MAX_CANDIDATES = 12;

const SUFFIXES = [
  '展望台',
  '观景台',
  '植物园',
  '动物园',
  '美术馆',
  '博物馆',
  '展览馆',
  '天文馆',
  '水族馆',
  '火车站',
  '地铁站',
  '度假村',
  '大社',
  '神社',
  '神宫',
  '寺院',
  '寺庙',
  '古寺',
  '公园',
  '花园',
  '城堡',
  '灯塔',
  '教堂',
  '清真寺',
  '宫殿',
  '故宫',
  '乐园',
  '车站',
  '机场',
  '市场',
  '广场',
  '海滩',
  '沙滩',
  '温泉',
  '码头',
  '港口',
  '瀑布',
  '峡谷',
  '海岸',
  '步道',
  '大道',
  '大街',
  '胡同',
  '寺',
  '塔',
  '山',
  '湖',
  '岛',
  '桥',
  '城',
  '坂',
  '巷',
  '宫',
  '园',
];

const PREFIXES = [
  '参观了',
  '先去',
  '去了',
  '到了',
  '逛了',
  '再去',
  '打卡',
  '然后',
  '下午',
  '上午',
  '早上',
  '晚上',
  '中午',
  '今天',
  '明天',
  '我们',
  '可以',
  '之后',
  '最后',
  '接着',
  '还有',
  '以及',
  '先',
  '再',
  '又',
  '也',
  '在',
  '去',
  '到',
  '从',
  '和',
  '与',
  '了',
  '的',
  '逛',
  '吃',
  '看',
].sort((left, right) => right.length - left.length);

const SPAN_BLOCK = new Set([
  '很多山',
  '这座城',
  '一座城',
  '过桥',
  '上山',
  '下山',
  '爬山',
  '城市',
  '江山',
  '山水',
  '山里',
  '城里',
  '桥上',
]);

const TAG_WORDS = ['旅行', '旅游', '攻略', '打卡', '分享', '推荐', '美食', '日常', '穿搭', '摄影', '探店', 'vlog', 'travel', 'trip', 'guide', 'ootd'];

const GENERIC =
  /^(?:行程|攻略|小贴士|注意事项|交通方式?|门票|费用|人均|美食|住宿|总结|推荐|分享|打卡|日常|今天|明天|路线|地点|tips?|notes?|day\s*\d+|第\s*[0-9０-９一二三四五六七八九十]+\s*天)$/i;

const ENGLISH_SUFFIX =
  /(?:Temple|Shrine|Taisha|Park|Museum|Station|Tower|Castle|Garden|Beach|Market|Island|Bridge|Palace|Cathedral|Mosque|Lookout|Observatory|Falls|Lake|Mountain|Dera)$/i;

const SPAN_PATTERN = new RegExp(`[\\u3400-\\u9fff]{1,12}(?:${SUFFIXES.join('|')})`, 'g');

/**
 * 从攻略或帖子正文里抽出可能的地名。只做字面规则，不调用模型。
 * 结果给用户确认，不会直接写进行程。
 */
export function extractPlaceCandidates(text: string): string[] {
  const source = text.replace(/\r\n?/g, '\n').replace(/\uFE0F/g, '');
  const found: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string | undefined) => {
    const name = cleanCandidate(raw ?? '');
    if (!isPlausible(name)) {
      return;
    }
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    found.push(name);
  };

  for (const match of source.matchAll(/#([^\s#]{2,24})/g)) {
    const tag = (match[1] ?? '').replace(/[，,。！？!?、].*$/u, '');
    if (!tag || isBlockedTag(tag)) {
      continue;
    }
    if (hasPlaceSuffix(tag) || isCompactName(tag)) {
      push(tag);
    }
  }

  for (const rawLine of source.split('\n')) {
    const line = rawLine.replace(/#[^\s#]+/g, ' ').trim();
    if (!line) {
      continue;
    }
    const pieces = splitPieces(line);
    const marked = pieces.length > 1 || isMarkedLine(rawLine);
    for (const piece of pieces) {
      const spans = extractSpans(piece);
      if (marked) {
        const cleaned = cleanCandidate(piece);
        if (spans.length === 0 || hasPlaceSuffix(cleaned)) {
          push(piece);
        }
      }
      for (const span of spans) {
        push(span);
      }
      for (const span of extractBrackets(piece)) {
        push(span);
      }
    }
  }

  return found.slice(0, MAX_CANDIDATES);
}

export function reachedCandidateLimit(names: string[]): boolean {
  return names.length >= MAX_CANDIDATES;
}

function splitPieces(line: string): string[] {
  const arrowParts = line
    .split(/\s*(?:→|->|➜|⇒|➡)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (arrowParts.length > 1) {
    return arrowParts;
  }
  const listed = line
    .split(/[、]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (listed.length > 1 && listed.every((part) => part.length <= 16)) {
    return listed;
  }
  return [line.trim()];
}

function isMarkedLine(line: string): boolean {
  return /^\s*(?:[0-9０-９]+[.、．)\]]|第\s*[0-9０-９一二三四五六七八九十]+\s*站|地点|打卡|位置|目的地|路线|[📍📌🏯⛩️🗼🗺🚩•*·・])/u.test(
    line,
  );
}

function extractSpans(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(SPAN_PATTERN)) {
    const name = trimSpan(match[0] ?? '');
    if (name && !SPAN_BLOCK.has(name)) {
      found.push(name);
    }
  }
  return found;
}

function extractBrackets(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/[「【\[《]([^」】\]》]{2,20})[」】\]》]/g)) {
    if (match[1]) {
      found.push(match[1]);
    }
  }
  return found;
}

function trimSpan(value: string): string {
  return stripLeadingWords(value).trim();
}

function cleanCandidate(raw: string): string {
  let value = raw.replace(/\uFE0F/g, '').trim();
  value = value.replace(/^[📍📌🏯⛩️🗼🗺🚩✨🌟⭐★☆👉]+/u, '').trim();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const next = value
      .replace(/^(?:路线|行程|推荐|地点|打卡|位置|目的地|站名)\s*[:：]\s*/u, '')
      .replace(/^第\s*[0-9０-９一二三四五六七八九十]+\s*站\s*[:：.\-]?\s*/u, '')
      .replace(/^第\s*[0-9０-９一二三四五六七八九十]+\s*天\s*[:：.\-]?\s*/u, '')
      .replace(/^[0-9０-９]+[.、．)\]]\s*/u, '')
      .replace(/^day\s*[0-9]+\s*[:：.\-]?\s*/i, '')
      .replace(/^[\s\-*•·・]+/u, '')
      .trim();
    if (next === value) {
      break;
    }
    value = next;
  }
  value = value.replace(/\s*[（(][^）)]{1,24}[）)]\s*$/u, '').trim();
  value = value.replace(/\s*(?:约)?\d+\s*(?:分钟|小时|min|mins|h)\s*$/i, '').trim();
  value = value.replace(/\s+\d{1,2}:\d{2}(?:\s*[-~到至]\s*\d{1,2}:\d{2})?\s*$/u, '').trim();
  value = value.replace(/[。！？!?；;：:、,，].*$/u, '').trim();
  value = stripLeadingWords(value);
  return value.replace(/\s+/g, ' ').trim();
}

function stripLeadingWords(value: string): string {
  let current = value.trim();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const prefix = PREFIXES.find((item) => current.startsWith(item) && current.length > item.length);
    if (!prefix) {
      break;
    }
    const rest = current.slice(prefix.length).trim();
    if (prefix.length === 1 && !hasPlaceSuffix(rest)) {
      break;
    }
    current = rest;
  }
  return current;
}

function hasPlaceSuffix(value: string): boolean {
  return SUFFIXES.some((suffix) => value.endsWith(suffix)) || ENGLISH_SUFFIX.test(value);
}

function isPlausible(name: string): boolean {
  if (name.length < 2 || name.length > 30) {
    return false;
  }
  if (!/[A-Za-z0-9\u3400-\u9fff]/.test(name)) {
    return false;
  }
  if (/https?:|www\./i.test(name)) {
    return false;
  }
  if (GENERIC.test(name)) {
    return false;
  }
  if (name.split(/\s+/).length > 6) {
    return false;
  }
  if (name.length > 18 && !hasPlaceSuffix(name) && !/[A-Za-z]/.test(name)) {
    return false;
  }
  return true;
}

function isBlockedTag(tag: string): boolean {
  const value = tag.trim().toLocaleLowerCase();
  if (['日本', '国内', '出国', '小红书', 'instagram', 'ins'].includes(value)) {
    return true;
  }
  return TAG_WORDS.some((word) => value.includes(word));
}

function isCompactName(tag: string): boolean {
  if (tag.length < 2 || tag.length > 8) {
    return false;
  }
  return /[\u3400-\u9fff]/.test(tag) || /^[A-Z][A-Za-z0-9'’.-]+$/.test(tag);
}
