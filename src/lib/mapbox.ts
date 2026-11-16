const PLACEHOLDER_VALUES = new Set([
  'pk.your_public_token_here',
  'your_public_token_here',
  'pk.your_token',
]);

/**
 * 读取可以放进客户端的 Mapbox 公开令牌。
 * 没配置、仍是占位符、或不是 pk. 开头（例如误填了 sk. 秘密令牌）时返回 null。
 * 返回 null 时界面改显示示意路线，应用仍然可以打开。
 */
export function getMapboxPublicToken(): string | null {
  const raw = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (typeof raw !== 'string') {
    return null;
  }

  const token = raw.trim();
  if (!token || PLACEHOLDER_VALUES.has(token)) {
    return null;
  }
  if (!token.startsWith('pk.')) {
    return null;
  }
  return token;
}
