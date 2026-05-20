# Cloudflare 部署

本文说明将 CloudWarden 部署到 Cloudflare Workers、D1 和 R2 的推荐流程。

## 最简单的页面部署方式

如果你希望主要通过页面点击部署，请使用 Cloudflare Workers 的 Git 集成：

1. 打开 Cloudflare Dashboard。
2. 进入 **Workers & Pages**。
3. 点击 **Create application**。
4. 选择 **Import a repository**。
5. 授权 GitHub，并选择 `heywin/CloudWarden`。
6. Worker 名称填写 `cloudwarden`。
7. Build command 留空或填写 `npm run typecheck`。
8. Deploy command 使用默认 `npx wrangler deploy`。
9. Root directory 留空。
10. 保存并部署。

如果 Deploy to Cloudflare 按钮提示无法创建 Git 仓库，说明按钮的模板克隆流程失败。此时不要重试创建仓库，直接走上面的“Import a repository”流程。

注意：Git 集成不会替你猜测 D1 数据库 ID。首次部署前仍需要创建 D1/R2，并把 D1 的 `database_id` 写入 `wrangler.toml` 后提交。

## 1. 登录 Cloudflare

```bash
npx wrangler login
```

确认当前账号：

```bash
npx wrangler whoami
```

## 2. 创建 D1 数据库

```bash
npx wrangler d1 create cloudwarden-db
```

命令会返回数据库 ID。将其写入 `wrangler.toml` 的 D1 绑定配置中：

```toml
[[d1_databases]]
binding = "DB"
database_name = "cloudwarden-db"
database_id = "<your-d1-database-id>"
migrations_dir = "migrations"
```

推荐绑定名为 `DB`。如果代码使用了其他绑定名，请保持代码和配置一致。

## 3. 创建 R2 存储桶

```bash
npx wrangler r2 bucket create cloudwarden-attachments
```

在 `wrangler.toml` 中绑定：

```toml
[[r2_buckets]]
binding = "ATTACHMENTS"
bucket_name = "cloudwarden-attachments"
```

推荐绑定名为 `ATTACHMENTS`。如果后续实现拆分了多个 bucket，应在 [配置文档](configuration.md) 中补充说明。

## 4. 应用 D1 迁移

如果项目使用 Wrangler 迁移：

```bash
npm run db:migrate:remote
```

等价命令：

```bash
npx wrangler d1 migrations apply cloudwarden-db --remote
```

## 5. 配置密钥

生产环境密钥应通过 Wrangler Secret 写入，不要提交到仓库。

示例：

```bash
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put JWT_SECRET
```

实际变量名见 [配置、环境变量与密钥](configuration.md)。

## 6. 部署 Worker

```bash
npm run deploy
```

部署完成后，Wrangler 会输出 Workers 域名，例如：

```text
https://cloudwarden.<your-subdomain>.workers.dev
```

如果绑定了自定义域名，请在 Cloudflare Workers 的 Triggers 中添加 Route 或 Custom Domain。

## 7. 部署后检查

建议检查：

- 健康检查接口是否可访问。
- D1 迁移是否已应用。
- R2 bucket 是否可读写。
- 注册策略是否符合预期。
- Bitwarden 客户端能否登录和同步。

## 备份建议

D1 备份示例：

```bash
npx wrangler d1 export cloudwarden-db --remote --output ./backups/cloudwarden.sql
```

R2 可以通过 Wrangler 或 Cloudflare 控制台下载关键对象。生产环境建议定期备份，并把备份存放在与 Cloudflare 账号隔离的位置。
