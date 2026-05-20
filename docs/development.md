# 本地开发

本文说明 CloudWarden 在本地开发时的推荐流程。当前命令按现有 `package.json` 和 `wrangler.toml` 记录。

## 前置要求

- Node.js 20 或更新版本。
- npm、pnpm 或项目实际采用的包管理器。
- Cloudflare 账号。
- Wrangler CLI。通常可通过 `npx wrangler` 使用，也可以全局安装。

## 安装依赖

```bash
npm install
```

## 本地启动

推荐通过 Wrangler 启动 Workers 开发环境：

```bash
npm run dev
```

等价命令：

```bash
npx wrangler dev
```

本地服务启动后，控制台会显示访问地址，通常类似：

```text
http://127.0.0.1:8787
```

## 本地 D1

Wrangler 可以使用本地 D1 数据库模拟开发环境。常见命令如下：

```bash
npm run db:migrate:local
```

等价命令：

```bash
npx wrangler d1 migrations apply cloudwarden-db --local
```

## 本地 R2

R2 绑定通常由 Wrangler 在本地模拟。开发时只需确保 `wrangler.toml` 或部署配置中存在对应 bucket 绑定。

推荐绑定名：

```toml
[[r2_buckets]]
binding = "ATTACHMENTS"
bucket_name = "cloudwarden-attachments"
```

## 常见检查

```bash
npm run typecheck
npm test
```

`npm test` 会先执行 TypeScript 类型检查，再用 Miniflare 启动本地 Worker，验证注册、登录、刷新令牌、同步、文件夹、条目、批量导入和 Send。

## 开发注意事项

- 不要把生产密钥写入 `.env` 后提交。
- 本地测试导入数据时，优先使用脱敏后的 Bitwarden JSON。
- 如果修改了 D1 结构，请同时补充迁移文件和备份/恢复说明。
- 如果修改了 Bitwarden API 兼容行为，请同步更新 [已支持与不支持功能](features.md)。
