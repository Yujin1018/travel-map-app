# 旅行地图

给自己用的世界旅行地图。把想去的地点收进列表，按直线距离分成几天，再在地图上看每一天的顺序。连线只表示先后，不是道路，也不估算交通时间。

地图使用 Mapbox。地点搜索用的是 Search Box 文本搜索，令牌仍是下面这一个公开令牌。没有令牌也可以打开应用。

## 准备

电脑需要安装 [Node.js](https://nodejs.org/) 的 LTS 版本。

手机上的 Expo Go 需要支持 **Expo SDK 58**。本项目用的就是这个 SDK。如果打开后提示版本不兼容，到应用商店把 Expo Go 更新到最新版。

## 安装 Expo Go

1. iPhone：打开 App Store，搜索 **Expo Go**，安装 Expo 官方的应用。
2. Android 手机：打开 Google Play，搜索 **Expo Go**，安装官方应用。
3. 也可以从 Expo 的下载页进入：<https://expo.dev/go>

装好后打开一次，确认可以扫二维码。Expo Go 是用来预览的，不是装进手机主屏幕的独立应用。手机和电脑不在同一网络，或路由器隔离了设备时，扫码会超时。这次的代码改动不能保证修好家里的 Wi-Fi。可以先在电脑浏览器里用。

## 配置 Mapbox 令牌

还没有 `.env` 时，在项目根目录执行：

```bash
cp .env.example .env
```

Windows 命令提示符里，只有文件不存在时才复制，避免盖掉已经填好的令牌：

```bat
if not exist .env copy .env.example .env
```

然后用编辑器打开 `.env`，把占位内容换成你的公开令牌：

```bash
EXPO_PUBLIC_MAPBOX_TOKEN=pk.你的公开令牌
```

公开令牌在 <https://account.mapbox.com/> 的 **Access tokens** 里，以 `pk.` 开头。不要填写以 `sk.` 开头的秘密令牌，也不要把它提交到 Git。`.env` 已经写在 `.gitignore` 里。

已经有 `.env` 时，不要再运行 `cp .env.example .env` 或 `copy /Y .env.example .env`。更新代码不会改这个文件。

保存后重新运行 `npx expo start`。改 `.env` 时，正在运行的 Expo 不会自动重新读取。

没有令牌时，应用仍然会打开。地图页会用中文说明原因，并按示例地点画出示意路线。搜索会说明暂时不能查坐标。

## 在 Windows 上更新这一支

在已经克隆好的项目文件夹里打开命令提示符。下面的命令不会覆盖已有的 `.env`。

```bat
cd C:\你的路径\travel-map-app
git status
git fetch origin
git checkout cursor/plan-multiday-itinerary-d1f8
git pull origin cursor/plan-multiday-itinerary-d1f8
npm install
npx expo start
```

`git status` 如果列出你改过的程序文件，先不要 pull，免得把那些修改弄丢。`.env` 被 Git 忽略，正常的 fetch、checkout、pull 不会动它。

浏览器预览：

```bat
npx expo start --web
```

## 现在能做什么

- 搜索地点名称。结果会写出地名，以及当地、地区和国家。可以放进「想去的地点」，或直接加到当前这一天。同一个 Mapbox 地点，或名称和坐标都相同的地点，不会重复加入。
- 搜索到的坐标只在这次打开应用时用来画地图。按 Mapbox 现在的条款，Search Box 返回的数据只能临时使用，不能把位置存下来。所以这些坐标不会写入设备，也不会写进备份。重新打开后，名称还在，需要再搜一次才能出现在地图上。手填的经纬度，以及示例里的坐标，会保存。
- 把攻略正文粘贴进来。程序按标点、编号和常见地名用字列出候选，不是人工智能，也不能从图片里读。可以改候选名字，再查找坐标。一个名字有多个结果时，要点选一个才会加入。
- 想去的地点和已经排好、并且这次有坐标的地点，可以按直线距离分成若干天，默认 3 天。先看预览，确认后才会替换现在的安排。这不是沿道路规划，也不会估算交通时间。
- 可以新增、重命名、删除某一天。至少保留一天。地图只画当前选中的那一天里、这次有坐标的地点。
- 可以导出 JSON 备份，再在另一台设备导入。导入前会要求确认，因为这会替换当前行程。浏览器里的数据和手机里的数据不会自动同步。
- 没有保存过时，会看到京都半日的示例。已经改过的行程不会被示例盖掉，需要时可以手动恢复示例。
- 示例里的「40 分钟」「25 分钟」是写在数据里的占位数字，不是算出来的。重新分配行程后，这些占位用时不会继续跟着走。

Search Box 文档目前把支持的地区写成美国、加拿大和欧洲，列出的语言里也没有中文。同一页又写了日本地址的类型。日本等地的景点可能搜不到。搜不到时用手填坐标。

## 搜索坐标为什么刷新后不在地图上

现在的公开令牌不能合法地把搜索到的坐标存下来。依据是 Mapbox 当前文档：

- [Search Box API](https://docs.mapbox.com/api/search/search-box/)：接口返回的数据只能临时使用。要保存位置，需要联系 Mapbox 销售。寺庙、景点这类结果走的就是这个接口。
- [Geocoding API](https://docs.mapbox.com/api/search/geocoding/)：默认也是临时结果，不能缓存。把参数设成 `permanent=true` 之后才允许长期保存，但文档写明这需要账户里有信用卡或企业合同，而且地理编码不返回景点。
- [Search API 的永久正向地理编码](https://docs.mapbox.com/api/search/search/)：同样要联系销售，并且写明永久结果里不含景点。

所以这次没有打开 `permanent=true`，也没有把搜索坐标写进本地或备份。刷新或重新打开后，名称还在，地图上先不画。行程页每个这样的地点有「重新查找」，点一个结果后只在这次打开时画上。想让图钉一直留下，请手填经纬度。

如果要让寺庙和景点的搜索结果在重新打开后仍然出现在地图上，需要你先同意其中一件事：

1. 向 Mapbox 销售申请保存 Search Box 位置数据的许可，并说明要包含景点。拿到许可之前，这支代码不会把那些坐标写进设备。
2. 或者在 Mapbox 账户里开通地理编码的永久存储。那仍然保存不了景点，只能保存地址、城市这类结果。

费用以 Mapbox 当时的说明为准，这里不写价格。

## 以后装到手机上

这次没有登录 Expo、没有注册 Apple 或 Google 的应用、没有执行云端构建，也没有生成安装包。

`app.json` 里的 `app.travelmap.preview` 只是占位用的包名和 iOS Bundle Identifier。它还没有注册。真正构建或上架前，必须换成你自己确认过的标识。仓库里没有 Expo project id，也没有证书。

`eas.json` 里有三种配置，只是写好了，没有跑过：

- `preview`：Android 打 APK，用来装到自己的 Android 手机，不经过应用商店。iOS 这一档不是模拟器包，真机构建需要 Apple 开发者账号和签名。
- `development`：开发客户端。用来装一个带开发菜单的壳，再连到你电脑上的 Metro。它不是 TestFlight，也不是商店里的正式应用。
- `ios-simulator`：只给 Mac 上的 iOS 模拟器。不能装到 iPhone。

这几件事不是同一种安装方式：

- **Expo Go**：现在就能扫码预览，手机要能连上电脑。卸载 Expo Go 或换设备后，里面的本地行程不会跟着走，请先导出备份。
- **Android APK**：用 `preview` 配置打出来的安装包，可以装到 Android 上。需要 Expo 账号，并会用到 EAS 的构建次数。费用以 Expo 当时的说明为准，这里不写价格。
- **iOS 模拟器**：只能在 Mac 上打开。
- **iPhone 真机开发包或 TestFlight**：需要付费的 Apple Developer 账号、证书、描述文件，以及你确认过的 Bundle Identifier。TestFlight 还要交给 Apple 处理。这次没有创建这些东西。

准备好账号和自己的包名之后，才考虑安装 EAS CLI 并登录。在那之前不要运行 `eas build`。

## 文件夹

- `src/app/`：页面。`index.tsx` 是地图，`itinerary.tsx` 是行程。
- `src/components/`：地图、地点列表、帖子导入、备份和页面外壳。
- `src/state/`：行程的读取、保存和修改。
- `src/data/sample-itinerary.ts`：第一次打开时用的示例地点。
- `src/lib/mapbox-search.ts`：搜索地点。
- `src/lib/extract-place-candidates.ts`：从正文里按规则抽出可能的地名。
- `src/lib/plan-days.ts`：按经纬度直线距离分组。
- `src/lib/itinerary-storage.ts`：保存前去掉搜索坐标，以及备份文件的读写。
- `eas.json`：还没执行过的构建配置。
- `app.json`：应用名称。里面的包名是占位符。
- `.env.example`：令牌变量名的例子。

## 这次实际检查过

在这台开发环境里跑过，并且通过了：

- `npx tsc --noEmit`
- 分组、地名提取、备份和存档解析的单元测试
- `npx expo-doctor`（20 项都通过。检查前把几个偏旧的 SDK 58 小版本对齐到了当时要求的版本）
- `npx expo export --platform web`
- `npx expo export --platform ios` 和 `android`。产物是 JavaScript 包（`.hbc`），不是能装到手机上的 IPA 或 APK
- 浏览器窄屏上看过行程和地图。没有在 iPhone 或 Android 真机上打开
- 对照过上面三份 Mapbox 文档。没有改成把搜索坐标存进设备

没有运行 `eas build`，没有登录 Expo，也没有注册应用。

## 还没做

- 从图片里识别地名
- 按真实道路画线，或估算交通时间
- 把 Mapbox 搜索到的坐标长期保存。对方要求永久存储时要另外联系销售，这次没有开通，也没有保存这些坐标
- 在真机上安装独立应用，或提交商店。还没有在 iPhone 上实测
