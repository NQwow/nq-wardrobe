# nq的衣柜

纯本地、单用户、离线优先的衣柜管理应用。数据全部存在浏览器 / App 内的 IndexedDB，
不依赖任何后端；AI 能力已预留接口但默认关闭。

先用浏览器调试，第四阶段再通过 Capacitor 打包成安卓 APK。

---

## 快速开始

依赖已经装好了，直接跑第 2 步就行。

```bash
# 1. 安装依赖（首次或换机器时才需要）
npm install

# 2. 启动开发服务器，浏览器打开终端里输出的地址（默认 http://127.0.0.1:5173/）
npm run dev

# 3. 类型检查 + 生产构建
npm run build

# 4. 本地预览构建产物（默认 http://127.0.0.1:4173/）
npm run preview
```

可用的脚本：

| 脚本 | 作用 |
|---|---|
| `npm run dev` | 启动 Vite 开发服务器（热更新） |
| `npm run build` | `vue-tsc --noEmit` 类型检查 + `vite build` 生产构建 |
| `npm run build:only` | 跳过类型检查，只做构建 |
| `npm run typecheck` | 只做类型检查 |
| `npm run preview` | 预览 `dist` 产物 |

> **关于 pnpm**：本项目最初用 pnpm 安装，`pnpm-workspace.yaml` 里设置了
> `nodeLinker: hoisted`（扁平化 `node_modules`），并显式关闭了 `esbuild` / `vue-demi`
> 的安装脚本——esbuild 的平台二进制由可选依赖 `@esbuild/win32-x64` 直接提供，
> vue-demi 默认入口就是 Vue 3，都不需要跑安装脚本。
> 用 npm 跑脚本完全没问题；如果要用 pnpm 重装依赖，先 `corepack enable pnpm`。
> 注意别混用：同一份 `node_modules` 被两个包管理器轮流装容易出问题。

---

## 技术栈

Vite 5 · Vue 3（`<script setup>`）· TypeScript · Vue Router 4（hash 模式）·
Pinia · Dexie.js（IndexedDB）· 原生 CSS + CSS 变量 · Capacitor 6（第四阶段）

没有引入任何 UI 组件库，所有样式都是可读的原生 CSS。

---

## 设计风格：孟菲斯（Memphis）

界面遵循孟菲斯（Memphis）设计语言：

- **撞色**：`#ff6b6b` 红 / `#feca57` 黄 / `#48dbfb` 青 / `#ff9ff3` 粉 / `#1dd1a1` 绿，
  底色米白 `#fef9ef`，文字与描边用纯黑 `#101010`
- **粗描边**：所有面板/控件 `3px`（桌面 `4px`）纯黑描边，一律直角，禁止细边框与灰色描边
- **硬阴影**：`5px 5px 0 0` 这种零模糊偏移阴影；按钮 hover 时**换色并增大阴影**，按下时完全贴地
- **几何装饰**：圆形、三角形、菱形、半圆、十字、点状/条纹/波浪/折线图案；
  卡片 hover 时内部各装饰**朝不同方向**漂移或旋转（Playful Chaos）
- **字体**：系统无衬线栈（离线可用，中文优先苹方 / 雅黑），标题用 `900` 字重 + 收紧字距；
  编号与数字用等宽字体并对齐
- **无 emoji**：所有图标都是 `AppIcon` 里的线性 SVG，几何装饰是 `AppGeo` 里的 CSS 图形

设计令牌集中在 [`src/assets/styles/variables.css`](src/assets/styles/variables.css)（`--m-*`），
可复用的孟菲斯组件库（`.m-card` / `.m-btn` / `.m-chip` / `.m-field` / `.m-row-item` / `.m-fact` /
`.m-geo` / 图案类）集中在 [`src/assets/styles/global.css`](src/assets/styles/global.css)。
组件自己只写特有排版，通用外观走这套类。

### 响应式

| 断点 | 布局 |
|---|---|
| `< 640px` | 单列；底部 tab 导航；衣服 2 列 |
| `≥ 640px` | 衣服 3 列；弹窗改为居中/侧边抽屉 |
| `≥ 700px` | 内容留白加大；详情/编辑页改两列；表单并排 |
| `≥ 1024px` | **底部 tab 换成左侧 240px 导航栅**；衣服 4 列；设置等页面两列；背景出现几何装饰 |
| `≥ 1440px` | 衣服 5 列 |

深色模式：画布转纯黑，描边与硬阴影转米色，五个撞色保持不变。

---

## 目录结构

```
src/
├── main.ts                 应用入口，先初始化数据库再挂载界面
├── App.vue                 根组件：路由出口 + 底部导航 + 全局 Toast / 二次确认
├── assets/styles/          variables.css（CSS 变量）+ global.css（reset 与工具类）
├── models/                 纯类型定义（Wardrobe / Clothing / Tag / Outfit / Diary / Setting）
├── db/                     Dexie 实例与首次启动的预设标签 seed
├── repositories/           只做数据库读写，不含业务规则
├── services/               业务逻辑（含 aiService / recommendService 预留）
├── stores/                 Pinia store（setup 语法）
├── composables/            useToast / useConfirm / useImageCompress
├── utils/                  id / date / blob / validate
├── components/base/        无业务逻辑的基础组件
├── components/business/    业务组件（卡片、网格、选择器、上传器等）
├── views/                  11 个页面
└── router/index.ts         路由表（hash 模式）
```

分层原则：

```
views / components  →  stores  →  services  →  repositories  →  db  →  IndexedDB
```

页面不直接访问 `db` 或 `repositories`；service 不操作 DOM；repository 只做 CRUD。

---

## 已实现的功能（第一阶段）

- **我的衣柜**：搜索（名字 / 编号 / 备注 / 标签名，250ms 防抖）、衣柜多选筛选、
  标签筛选面板、状态筛选、排序（最近添加 / 最近穿着 / 穿着次数 / 名称 / 编号）、
  网格卡片、快捷收藏、悬浮新增按钮
- **衣服详情**：大图轮播、编号与名字、改所属衣柜、标签分组、状态切换、收藏、
  备注、穿着次数与最后穿着时间、编辑、软删除（二次确认）
- **新增 / 编辑衣服**：多图上传（自动压缩 + 缩略图，可设主图）、编号自动生成且可改、
  衣柜单选、品类 / 季节 / 颜色必选标签 + 风格 / 场合 / 材质可选、支持现场新建标签、
  状态与收藏、备注、离开未保存提示
- **收藏页**：复用网格，支持搜索 / 排序 / 衣柜筛选 / 标签筛选
- **设置**：应用名（同步浏览器标题栏）、主题（浅色 / 深色 / 跟随系统）、默认排序、
  衣柜管理入口、标签管理入口、导出备份、导入备份（覆盖）、清空数据、
  AI 配置（服务商 / Base URL / API Key / 模型名 / 测试连接）
- **衣柜管理**：新增、重命名、换图标与颜色、上下排序、设为默认；
  删除时把衣服迁移到其它衣柜
- **标签管理**：按类型分组、一级 / 二级结构、新增 / 编辑 / 删除自定义标签，
  预设标签不可删除
- **数据备份**：导出 JSON（图片转 Base64，文件名 `nq-wardrobe-backup-YYYYMMDD-HHmm.json`），
  导入时校验版本并在单个事务里覆盖写入
- **预设标签**：首次启动自动写入品类 20 个、季节 4 个、颜色 13 个、风格 6 个、场合 6 个，
  共 49 个，并创建默认衣柜「我的衣柜」

### 第二阶段预留（当前是可用骨架）

- **搭配模式**：8 个槽位画布 + 素材区选衣 + 保存为搭配；搭配详情页载入后回到画布继续编辑
- **穿搭日记**：日记列表 + 新增表单 + 「很久没穿」列表；保存时会写入穿着记录并累加 `wearCount`

### 第三阶段预留（仅接口与配置）

- `aiService.recognizeClothing` / `recommendOutfits` 会抛「尚未实现」，
  `aiService.testConnection` 已可用（设置页的「测试连接」）
- `recommendService.recommend` 是规则推荐（当季 → 很久没穿 → 收藏 → 颜色不冲突）

---

## 打包成安卓 APK

**不需要域名、不需要服务器。** Capacitor 会把 `dist/` 里的网页资源整个打进 APK，
应用启动时 WebView 通过本地 `https://localhost` 直接读 APK 内的文件，
全程不联网；衣服数据依旧存在手机本地的 IndexedDB 里，卸载 App 才会清掉。

### 一次性准备

| 依赖 | 要求 | 说明 |
|---|---|---|
| JDK | 17 或更高（本项目在 21 上验证） | Gradle 需要 |
| Android SDK | `platforms;android-36` + `build-tools;36.0.0` | 只需命令行工具即可，不必装 Android Studio |

SDK 安装方式（命令行，约 200 MB）：

```powershell
# 1. 下载 command line tools 并解压到 D:\Android\Sdk\cmdline-tools\latest
#    https://developer.android.com/studio#command-tools

# 2. 接受许可并安装需要的包
$sdk = 'D:\Android\Sdk'
& "$sdk\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root=$sdk --licenses
& "$sdk\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root=$sdk `
    'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
```

然后在 `android/local.properties` 里写一行 SDK 路径（这个文件不进版本库）：

```properties
sdk.dir=D\:\\Android\\Sdk
```

### 出包

```bash
npm run android:apk           # 调试包：类型检查 → 构建 → 同步 → 打 APK
npm run android:apk:release   # 正式包（需要先按下面配置签名）
npm run android:sync          # 只改前端时用：重新构建并同步到安卓工程
npm run android:open          # 装了 Android Studio 的话可以直接打开工程
```

产物位置：

```
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/apk/release/app-release.apk
```

### 装到手机

手机打开「设置 → 关于手机 → 连点版本号」开启开发者选项，再打开「允许安装未知来源应用」，
然后把 APK 拷进手机点击安装即可。用数据线的话也可以：

```powershell
& 'D:\Android\Sdk\platform-tools\adb.exe' install -r android\app\build\outputs\apk\debug\app-debug.apk
```

### 关于签名（想长期用 / 想出正式包再看）

调试包用 Android 自动生成的调试密钥签名，自己装着玩完全够用。
如果要用 `assembleRelease` 出正式包，需要自己生成一个密钥库并**妥善备份**——
以后更新应用必须用同一个密钥，否则装不上（只能先卸载重装，数据会丢）：

```powershell
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v `
  -keystore android\nq-wardrobe.jks -alias nq-wardrobe `
  -keyalg RSA -keysize 2048 -validity 10000
```

### 打包相关说明

- 应用名、包名在 [`capacitor.config.ts`](capacitor.config.ts)：`com.nq.wardrobe` / `nq的衣柜`。
  改包名会让已安装的旧版变成「另一个应用」，不要随便动。
- 桌面图标与启动图是脚本生成的孟菲斯几何构成，分别在
  `android/app/src/main/res/mipmap-*/` 和 `drawable-*/splash.png`。
- 权限只声明了 `INTERNET`（Capacitor 内部需要，实际不联网）与相册读取权限；没有申请相机。
- `android/` 目录已经过定制，**要提交进版本库**；其中 `build/`、`local.properties`、
  密钥库等由 [`android/.gitignore`](android/.gitignore) 负责忽略。

---

## 注意事项

- 数据只存在当前浏览器 / 设备的 IndexedDB 里，换设备请用「设置 → 导出备份」迁移。
- 浏览器调试 AI 功能时可能被 CORS 拦住；打包进 Capacitor 后建议改用 `CapacitorHttp`。
- 手机端首次打开是空衣柜，点右下角 `+` 添加第一件衣服；预置的 49 个标签会自动写入。

