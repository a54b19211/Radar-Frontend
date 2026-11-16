# Radar-Frontend（统一前端原型）

这是统一前端的**原型**：一个 React 页面加一个 Node.js 只读适配服务，用来看 Fabric 的采集、清洗和交付情况。它是第一次调试时写的"采集工作台 v0.2"，**还不能直接用在新服务器上**，第 3 阶段按总 PRD 重写，页面可以复用。

总 PRD 在服务器 `/data/docs/总PRD-草稿.md`（第 8 节第 3 阶段）。

## 现状

- 页面：总览、资料、采集运行、流水线示意（`src/`）。
- 适配服务 `server/index.mjs`：浏览器只连它，它再去读后端，令牌只放在服务端。
- **它调用的是旧接口**：`/api/history/*`（旧 fabric 的接口名）和 `/api/documents/*`、`/api/agent/pipeline/overview`（图谱还在 fabric 里时的接口）。现在 fabric 的接口是 `/api/fabric/*`，图谱已拆到 Atlas，所以接上新服务器前要改适配服务。
- 旧的调试部署（4022 那台机器）不再使用，`deploy/` 里的两个服务文件是那时的，仅供参考。

## 第 3 阶段要做的（摘自 PRD）

1. 先写设计：有哪些页面、各服务要提供哪些接口。
2. 先做总览、资料库、监控三块；再做图谱（审核、合并、关系图、Neo4j 浏览，都走 Atlas 接口）；再做清洗抽检页（原件和清洗结果并排、人打对错）。
3. 前面一个 nginx，统一网址、统一登录。
4. 所有服务都走接口，前端不直接连数据库。

## 在新服务器上跑起来（开发用）

需要 Node.js 20.20.2（`.nvmrc`，新服务器上已装）。

```bash
cd /data/projects/BioRadar-frontend
npm ci
cp .env.example .env      # 按下面的说明填
npm run dev               # 只改页面时用，127.0.0.1
npm run build && npm start   # 构建后由适配服务一起提供页面和接口，默认 127.0.0.1:3234
```

`.env` 的几项：

| 变量 | 说明 |
|---|---|
| `HOST`、`PORT` | 适配服务监听地址，默认 `127.0.0.1:3234` |
| `FABRIC_URL` | fabric 读接口，新服务器上是 `http://127.0.0.1:18511` |
| `FABRIC_HISTORY_TOKEN_FILE` | fabric 读令牌所在的文件（放在项目外，权限 600） |
| `FABRIC_LABEL`、`FABRIC_HOST_LABEL` | 页面上显示的名字 |
| `FABRIC_PIPELINE_OVERVIEW` | 范围较大的总览查询，默认关 |

检查：`npm run check`（类型检查）、`npm run smoke`（页面冒烟，需要 Playwright 浏览器）。

## 共用设施

服务器怎么搭、各服务的端口和启动顺序，见部署仓库 a54b19211/ZK-radar-deploy。
