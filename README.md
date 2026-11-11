# BioRadar 数据采集观测台

独立前端项目。部署在 4022（zkserver），通过只读 API 连接 zktest 的现役 Fabric；不依赖后端源码、不切换后端分支。

访问地址：**http://100.125.40.22:3234/**。同机房也可访问 **http://172.16.10.1:3234/**。

## 已实现

- 采集总览：业务库资料总数、可观测来源、抽取状态和知识库同步状态。
- 可缩放、平移、点击下钻的流程画布；数字过渡、页面进出动画、来源占比动画与连线动效演示。
- 来源目录、分类与名称筛选、来源资料列表。
- 持续采集监测：运行/等待/失败/过期状态，最近检查、下一轮计划、查询范围、批次记录及错误。
- 资料分页、来源与状态过滤、正文详情；标题搜索明确限定当前页。
- 实际 API 快照导出；断线时标明问题并保留上次成功数据。
- 手机布局、键盘关闭/焦点约束、系统减少动态效果支持。

清洗细节与雷达调查流程保留入口，尚未接入。已有的“结构化抽取”统计不冒充清洗节点追踪。

## 开发

```bash
npm ci
cp .env.example .env
npm run build
npm start
```

开发前端可运行 `npm run dev`，Vite 的 `/api` 转发至本项目 3234 端口。需要先启动上述 API 适配服务。

技术：React、TypeScript、Vite、React Flow、Motion、Lucide；字体随构建产物提供，不依赖运行时外网字体服务。

主要文件：

| 文件                     | 职责                              |
| ------------------------ | --------------------------------- |
| `src/App.tsx`            | 工作台、总览、来源目录与活动页    |
| `src/FlowCanvas.tsx`     | 流程画布与动效                    |
| `src/DocumentsTable.tsx` | 服务端分页、筛选、资料入口        |
| `src/DetailDrawer.tsx`   | 来源、任务、流程和资料详情        |
| `src/api.ts`             | 自动刷新、断线状态                |
| `src/types.ts`           | 前端使用的数据结构                |
| `server/index.mjs`       | 只读 API 适配、缓存、静态文件服务 |

后端重构完成后，主要修改 `server/index.mjs` 中的适配，不需要让页面直接依赖各版本后端的返回字段。

## 当前部署

- 项目：`/home/zk_admin/zk_project/bioradar-console`
- 本地开发分支：`codex/collection-console`
- 前端服务：`bioradar-console.service`，端口 3234。
- 连接通道：`bioradar-console-tunnel.service`，仅在 4022 回环地址 18512 转发至 zktest 回环地址 18511。
- 配置：项目 `.env`；SSH 凭据与 History 只读凭据在 `~/.config/bioradar-console/`，目录权限 0700、凭据文件 0600，不提交 Git、不发送到浏览器。

```bash
systemctl --user status bioradar-console.service bioradar-console-tunnel.service
systemctl --user restart bioradar-console.service
```

前端服务和连接通道已配置开机随用户服务启动。不要重启或改动 Fabric、爬虫、数据库等现役服务来更新这个前端。

## API 与数据口径

浏览器只访问本项目前缀 `/api`，服务端使用明确声明的 GET 接口：

| 上游接口                                 | 用途                               |
| ---------------------------------------- | ---------------------------------- |
| `/api/documents`、`/api/documents/sites` | 业务库库存、来源数、来源计数和分页 |
| `/api/documents/{uuid}`                  | 资料详情                           |
| `/api/extraction/stats`                  | 抽取状态统计                       |
| `/api/weknora/stats`                     | Fabric 记录的同步状态              |
| `/api/history/sources`                   | 已获准读取的原生采集来源           |
| `/api/history/source-health`             | 持续监测状态、时间、最近批次与错误 |

1. **资料总量**仅为业务资料库内未删除条目，不包含独立 History 库。两套库不相加冒充去重总量。
2. **来源占比**的分母是业务库资料总量。History 来源数量没有现成统计时显示“未提供”，不以 `published_seq` 水位冒充记录数量。
3. **任务批次计数**来自最近保留的 `last_coverage` 回执，可能早于最近一次失败检查。详情显示 `last_page_at`。这不是整个任务的累计量，也不是全源覆盖率。
4. **任务状态**取持续监测 API；过期状态单独呈现，不把发表器心跳当爬虫正在运行。
5. **流程连线**表示逻辑流程，没有逐记录事件时不冒充真实执行轨迹。连线演示需显式开启，页面会标注“动效演示，不启动采集任务”；真实运行任务有独立状态动效。
6. “已同步”只是 Fabric 返回的同步状态，不代表检索质量已经验收。
7. 页面每 15 秒检查更新，隐藏页面暂停轮询；服务端汇总缓存 60 秒并合并并发请求，降低百万条库存统计压力。
8. 当前 URL、每分钟采集速率、History 逐条资料浏览、清洗节点日志与雷达分析尚未接入。没有这些字段时不伪造数字、时间曲线或完成百分比。

接口只读，没有采集启动、暂停、重试或清空功能。适配服务只返回页面需要的资料字段，不透传任意上游地址。

## 检查

```bash
npm run build
BROWSER_PATH=/path/to/chrome npm run smoke
```

`scripts/smoke.mjs` 运行一次实际浏览器检查：桌面布局、动效开关、来源筛选与详情、资料详情及分页、任务详情、断线保留、手机导航。只在浏览器内阻断一次请求验证断线提示，不修改真实服务。截图及结果在忽略提交的 `artifacts/` 中。

## 产品参考

- [Dify Run History](https://docs.dify.ai/en/cloud/use-dify/debug/history-and-logs)：从整体执行进入节点详情。
- [Airbyte Connection Timeline](https://docs.airbyte.com/platform/cloud/managing-airbyte-cloud/review-connection-timeline)：分开呈现任务状态、接收数量和运行事件。

采用其交互组织方式；本项目使用独立视觉设计，不复制原产品界面。
