# BioRadar 数据工作台

> 这是统一前端的原型（采集工作台 v0.2）。第 3 阶段按总 PRD 重写；下文的部署说明是旧环境的，仅供参考。

独立的 React 前端和 Node.js 只读 API 适配服务，用来观察 Fabric 的采集、清洗和知识交付。

## 本次维护交接（2026-11-16）

- **维护源码目录**：新开发服务器的 `/data/projects/BioRadar-frontend`（GitHub a54b19211/Radar-Frontend）。
- **当前源码**：4022 项目工作目录中的 v0.2.0，包含此前未提交的新页面。本次在交接副本中提交保存；原项目文件和现役服务未改动。
- **线上页面**：`http://100.125.40.22:3234/` 目前仍提供较早的 v0.1 静态构建。下面的功能说明描述本目录 v0.2 源码，不表示线上页面已经全部更新。
- **历史代码**：保留原 Git 历史，`baafc54` 是原有 v0.1 源码提交；交接副本继续使用 `codex/collection-console` 分支，没有配置远端。
- **运行环境**：Node.js **20.20.2**（与源主机一致，版本记录在 `.nvmrc`）。旧开发服务器 当前系统 Node.js 为 18，开发前需使用符合版本要求的 Node.js；本次未替换系统 Node，也未在 旧开发服务器 启动前端服务。
- **凭据**：源码包不含 `.env`、读令牌、SSH 密码或私钥。复制 `.env.example` 后填入本机配置；History 读令牌放在项目外的私有文件，用 `FABRIC_HISTORY_TOKEN_FILE` 指定。该令牌需由现有服务管理员配置。
- **验收状态**：v0.2 是待发布的维护起点，尚未完成整套浏览器交互验收。本次打包做源码构建和交付校验，不将其标记为已上线版本。

现役部署仍在 4022（zkserver），通过只读 API 连接 旧开发服务器 Fabric。旧开发服务器 本机开发直接连接 `127.0.0.1:18511`，无需沿用 4022 的 SSH 隧道。

访问地址：**http://100.125.40.22:3234/**；同机房地址：**http://172.16.10.1:3234/**。浏览器代理应对服务器地址直连，Tailscale 保持连接。

## 页面与功能

- **采集总览**：业务库存、监测状态、信源规模与可点击的数据路径；默认开启雷达背景和状态动效。
- **任务流水线**：检查时间、最近成功、下一轮计划、最近保留的批次计数，以及当前 run 的版本列表入口。
- **信源中心**：分类与名称筛选、来源占比、监测与发布心跳、业务资料和原文对照入口。
- **原文与清洗**：按来源检索、游标翻页、精确打开原文版本；左右查看原始响应、清洗正文、facts、JSON 和来源解析记录。
- **字段追溯**：读取服务提供的 JSON Pointer，定位真实原文位置；展示原始值与结构化值，不编造转换规则。
- **业务资料库**：历史业务库存、抽取统计、服务端状态/来源筛选和分页、原文下载。标题搜索明确限定当前页。
- **知识交付**：Fabric 的 WeKnora 同步统计与来源发布心跳。
- 深浅主题、动效开关、手机布局、断线保留快照、原文/结构化结果/当前快照导出。

## 数据口径

1. 业务库存与独立 History 原文版本库分别展示，不相加冒充去重总量。来源占比分母仅为业务库存。
2. History 查询固定 `is_demo=false`；列表按来源记录编号排序，不宣称是最新到达。
3. 首次查询由服务端生成带时区的 cutoff，游标翻页沿用同一 cutoff、来源、检索词与批次条件。
4. 原文、clean_text、facts 和字段出处按 source_id、source_record_id、version_id 精确对应。旧版本不会被当前版本替换。
5. 现役 API 没有通用的逐步清洗产物和执行耗时，因此页面展示已有产物，不伪造去噪/规范化/校验的运行回放。
6. WHO 的原始响应可能是包含 HTML 正文的 JSON；预览明确标为“响应中的 HTML 正文”，不冒充完整网页快照。HTML 在隔离 iframe 中预览，移除主动内容并禁止外部资源。
7. 最近批次计数来自 last_coverage，可能早于最近一次失败。当前 run 只使用 active_run_id 关联；结束后没有历史批次编号时保持未知。partial + record_budget 是有界完成，不是采集失败。
8. 运行流光表示状态与逻辑路径，不是逐条数据事件；断线、快照过期或无活跃采集时停流。背景扫描仅为视觉效果，不代表抓取事件。
9. WeKnora“已同步”是 Fabric 的状态记录。远端解析/向量索引回执需要额外权限，当前只读连接没有读取它们。
10. 页面每 15 秒检查更新；隐藏时停止轮询。服务端汇总缓存 60 秒并合并并发请求。

## 开发

先确认 `node --version` 为 v20.20.2 或符合 `package.json` 的版本要求。已安装 nvm 的开发环境可以执行 `nvm install && nvm use`。

```bash
cd /data/projects/BioRadar-frontend
npm ci
cp .env.example .env
npm run build
npm start
```

上述配置默认只监听 旧开发服务器 的 `127.0.0.1:3234`；需要对外提供页面时再明确设置 `HOST`。未配置 History 令牌时，原文版本相关功能不可用，业务库存等可用范围由上游权限决定。

开发前端：`npm run dev`。Vite 将 `/api` 转发至本项目 3234 端口，需同时运行适配服务。

技术：React、TypeScript、Vite、Motion、Lucide；字体随构建提供，无运行时外网字体依赖。流程使用原生 SVG 与 DOM，状态驱动动画。

| 文件                   | 职责                                     |
| ---------------------- | ---------------------------------------- |
| src/Console.tsx        | 页面导航、总览、业务库存与公共对话框     |
| src/PipelineScene.tsx  | 来源路径、状态动效与来源速览             |
| src/Operations.tsx     | 任务、信源与知识交付页面                 |
| src/Records.tsx        | History 分页、原文与清洗对照、字段定位   |
| src/content.ts         | JSON Pointer、JSON 行定位、HTML 隔离预览 |
| src/DocumentsTable.tsx | 历史业务资料分页与过滤                   |
| src/api.ts             | 自动更新、连接状态与请求处理             |
| src/console.css        | 深浅主题、响应布局与动效                 |
| server/index.mjs       | 只读 API 适配、缓存与静态文件服务        |

## 上游只读接口

- `/api/documents`、`/sites`、`/{uuid}`：业务资料库存和详情。
- `/api/extraction/stats`、`/api/weknora/stats`：抽取与同步统计。
- `/api/history/sources`、`/source-health`：允许读取的来源、持续监测与心跳。
- `/api/history/records`：当前版本列表和来源内检索。
- `/api/history/versions/{version_id}`：精确版本与原始/处理产物。
- `/api/history/runs/{run_id}`：已知采集批次及关联版本。

浏览器只访问本项目前缀 `/api`。服务端固定上游地址及允许的 GET 接口；History 凭据不会传到浏览器。没有采集启动、暂停、重试、清空等写操作。

## 4022 现役部署参考

- 项目：`/home/zk_admin/zk_project/bioradar-console`
- 分支：`codex/collection-console`
- 前端服务：`bioradar-console.service`，端口 3234。
- 隧道：`bioradar-console-tunnel.service`，4022 回环 18512 → 旧开发服务器 回环 18511。
- `.env` 与 `~/.config/bioradar-console/` 内凭据均不入 Git；凭据权限为 0600。
- 用户服务已启用开机运行，已启用 linger。

`deploy/` 里保留的是这套 4022 服务配置，其中有源服务器的绝对路径。迁到 旧开发服务器 部署时需调整工作目录和 Node 路径；旧开发服务器 本机连接 Fabric 不需要安装隧道服务。本次交接没有安装或修改这些服务。

```bash
systemctl --user status bioradar-console.service bioradar-console-tunnel.service
systemctl --user restart bioradar-console.service
```

可以用 `CONSOLE_DIST_DIR=dist-next PORT=3235 HOST=127.0.0.1` 在回环地址预验收新构建。上线替换构建并仅重启本项目前端服务；不需要改动 Fabric、数据库、采集或其他现役服务。

本次更新前的 Git bundle 与清单位于忽略提交的 `artifacts/releases/20261112-before-ui/`。

## 检查

```bash
npm run build
BASE_URL=http://127.0.0.1:3234 BROWSER_PATH=/path/to/chrome npm run smoke
```

只进行一次有针对性的浏览器检查：真实资料查询与字段出处、正文/JSON/HTML、其他页面、主题、断线保留、手机布局。HTML 隔离检查只替换测试浏览器的响应，不写入任何真实数据。结果与截图存于忽略提交的 artifacts 目录。

## 设计参考

- [Dify 节点追踪](https://docs.dify.ai/en/cloud/use-dify/monitor/logs)
- [Airbyte 连接时间线](https://docs.airbyte.com/platform/cloud/managing-airbyte-cloud/review-connection-timeline)
- [Foundry 数据连接](https://www.palantir.com/docs/foundry/data-connection/overview)

使用独立的视觉设计和真实接口，不复制设计稿中的模拟数据。
