# 旅行地图

给自己用的世界旅行地图。先把某一天想去的地点按顺序排好，在地图上看见它们的位置。搜索地点、沿真实道路画线、估算交通时间还没做，这一步只把项目和第一版界面搭起来。

地图使用 Mapbox，方便以后看全球的地方。没有令牌也可以打开应用。

## 准备

电脑需要安装 [Node.js](https://nodejs.org/) 的 LTS 版本。

手机需要安装 **Expo Go**，并且支持 **Expo SDK 58**。本项目用的就是这个 SDK。如果打开后提示版本不兼容，到应用商店把 Expo Go 更新到最新版。

## 安装 Expo Go

1. iPhone：打开 App Store，搜索 **Expo Go**，安装 Expo 官方的应用。
2. Android 手机：打开 Google Play，搜索 **Expo Go**，安装官方应用。
3. 也可以从 Expo 的下载页进入：<https://expo.dev/go>

装好后打开一次，确认可以扫二维码。

## 配置 Mapbox 令牌

1. 打开 <https://account.mapbox.com/> 并登录。
2. 进入 **Access tokens**，复制一个 **public token**。公开令牌以 `pk.` 开头。
3. 在项目根目录复制示例文件：

   ```bash
   cp .env.example .env
   ```

4. 用编辑器打开 `.env`，把占位内容换成你的令牌：

   ```bash
   EXPO_PUBLIC_MAPBOX_TOKEN=pk.你的公开令牌
   ```

5. 保存后重新运行 `npx expo start`。改 `.env` 时，正在运行的 Expo 不会自动重新读取。

请只填写公开令牌。不要把以 `sk.` 开头的秘密令牌写进项目，也不要把它提交到 Git。`.env` 已经写在 `.gitignore` 里。可以提交的是 `.env.example`，里面只有占位符。

没有令牌时，应用仍然会打开。地图页会用中文说明原因，并按示例地点画出示意路线。

## 运行

在项目根目录执行：

```bash
npm install
npx expo start
```

终端出现二维码后，让手机和电脑连同一个 Wi-Fi，用 Expo Go 扫码。

也可以在终端里按 `w`，用浏览器看界面。浏览器适合先看文字和列表示意；手机上的地图以 Expo Go 为准。

## 现在能做什么

- 查看写好的示例行程：京都的三个地点，按顺序排列。
- 上下移动、删除地点，或手动填写名称和经纬度再添加到这一天的最后。
- 行程保存在这台设备上。没有账号，也没有服务器。
- 配置了有效的 Mapbox 公开令牌后，地图页会用 Mapbox 显示这些地点。地点之间的连线只表示先后顺序，不是实际道路。
- 示例里的「40 分钟」「25 分钟」是写在数据里的占位数字，不是 Mapbox 算出来的。

## 文件夹

- `src/app/`：页面。`index.tsx` 是地图，`itinerary.tsx` 是行程。底部标签在 `src/components/app-tabs.tsx`。
- `src/components/`：地图、地点列表和页面外壳。
- `src/state/`：行程的读取、保存和修改。数据存在本机，键名是 `travel-map.itinerary.v1`。
- `src/data/sample-itinerary.ts`：第一次打开时用的示例地点。
- `src/types/itinerary.ts`：地点、一天、示例用时的数据结构。以后接搜索和路线规划时可以沿用。
- `src/lib/mapbox.ts`：读取公开令牌。没有可用令牌时返回空。
- `app.json`：应用名称和 Expo 配置。
- `.env.example`：令牌变量名的例子。

## 还没做

- 在地图上搜索真实地点
- 按顺序请求步行或公交路线，并把路线画到路上
- 用路线结果替换示例用时
