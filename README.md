# CloudWarden

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/heywin/CloudWarden)

CloudWarden 是一个面向个人使用的 Bitwarden 兼容服务，运行在 Cloudflare Workers 上，并使用 D1 保存结构化数据、R2 保存附件对象。它实现了个人密码库的核心 API：注册、登录、刷新令牌、同步、文件夹、条目、附件、Send 和批量导入。

## 文档导航

- [本地开发](docs/development.md)
- [Cloudflare 部署](docs/deployment.md)
- [配置、环境变量与密钥](docs/configuration.md)
- [Bitwarden 客户端设置](docs/clients.md)
- [导入 Bitwarden JSON](docs/import-bitwarden-json.md)
- [已支持与不支持功能](docs/features.md)

## 设计目标

- 个人或家庭小规模密码库服务。
- 尽量兼容 Bitwarden 官方客户端的常见个人使用流程。
- 使用 Cloudflare 的托管能力降低服务器维护成本。
- 数据存储拆分为 D1 和 R2：账户、组织、密码库元数据等结构化内容进入 D1，附件等二进制对象进入 R2。

## 非目标

- 不以多租户商业 SaaS 为目标。
- 不承诺完整实现 Bitwarden 官方服务器的全部企业能力。
- 不建议直接暴露给不受信任的大规模用户注册。
- 不替代正式安全审计。

## 快速开始

### 方式一：页面点击部署

点击上方 **Deploy to Cloudflare** 按钮，然后按页面提示完成：

1. 登录 Cloudflare。
2. 授权 Cloudflare 访问 GitHub。
3. 选择或创建要部署的仓库。
4. 保持 Worker 名称为 `cloudwarden`。
5. 填写 `JWT_SECRET` 和 `ADMIN_TOKEN`。
6. 部署完成后，在 Cloudflare 控制台进入该 Worker，确认 D1 和 R2 绑定已创建。
7. 如果 D1 迁移没有自动执行，在本地或 Cloudflare 控制台执行一次迁移：

```bash
npm run db:migrate:remote
```

Cloudflare 的一键部署会读取 `wrangler.toml`，自动创建并绑定 D1/R2 等资源。后续你只要 push 到 GitHub，Cloudflare Workers Builds 就会自动重新构建部署。

### 方式二：本地命令部署

安装依赖：

```bash
npm install
```

执行类型检查和本地 Worker 冒烟测试：

```bash
npm test
```

应用本地 D1 迁移：

```bash
npm run db:migrate:local
```

本地启动：

```bash
npm run dev
```

部署前需要在 Cloudflare 创建 D1 数据库和 R2 存储桶，并配置 Workers 绑定。完整流程见 [Cloudflare 部署](docs/deployment.md)。

## 当前绑定名

项目当前使用以下 Cloudflare 绑定：

| 类型 | 推荐绑定名 | 用途 |
| --- | --- | --- |
| D1 | `DB` | 保存用户、文件夹、密码库条目、Send 和附件元数据 |
| R2 | `ATTACHMENTS` | 保存附件对象数据 |

## 安全提醒

- 请只通过 HTTPS 访问生产服务。
- 请为管理员账号启用强主密码，并妥善保存恢复信息。
- 不要把生产密钥写入仓库。
- 部署前确认注册策略，避免开放注册导致陌生用户创建账户。
- Cloudflare Workers、D1、R2 均有配额限制，建议定期备份 D1 和关键对象。
