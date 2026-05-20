# 配置、环境变量与密钥

CloudWarden 的配置分为普通环境变量、Cloudflare 资源绑定和敏感密钥。

## Cloudflare 资源绑定

推荐绑定：

| 绑定名 | 类型 | 说明 |
| --- | --- | --- |
| `DB` | D1 | 主数据库 |
| `ATTACHMENTS` | R2 | 附件和对象存储 |

示例：

```toml
[[d1_databases]]
binding = "DB"
database_name = "cloudwarden-db"
database_id = "<your-d1-database-id>"
migrations_dir = "migrations"

[[r2_buckets]]
binding = "ATTACHMENTS"
bucket_name = "cloudwarden-attachments"
```

## 普通环境变量

普通环境变量可以写入 `wrangler.toml` 的 `[vars]`。

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `SERVER_NAME` | `CloudWarden` | 服务显示名称 |
| `SIGNUPS_ALLOWED` | `false` | 是否允许开放注册 |

示例：

```toml
[vars]
SIGNUPS_ALLOWED = "false"
SERVER_NAME = "CloudWarden"
```

## 敏感密钥

敏感值应使用 Wrangler Secret：

| 密钥 | 说明 |
| --- | --- |
| `JWT_SECRET` | 签发会话或访问令牌的密钥 |
| `ADMIN_TOKEN` | 管理接口或首次初始化使用的管理令牌 |

写入方式：

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_TOKEN
```

本地开发可以复制 `.dev.vars.example` 为 `.dev.vars`，填入本地测试密钥；`.dev.vars` 已被 `.gitignore` 忽略。

## 生成密钥

可以使用 OpenSSL 生成随机值：

```bash
openssl rand -base64 32
```

请将生成结果保存在密码管理器中。更换生产密钥前，需要确认旧令牌、会话和加密数据的兼容策略。

## 注册策略

个人服务建议：

```toml
[vars]
SIGNUPS_ALLOWED = "false"
```

首次创建账号可以采用以下方式之一：

- 临时设置 `SIGNUPS_ALLOWED = "true"`，使用 Bitwarden 客户端创建账号，完成后改回 `false` 并重新部署。
- 设置 `ADMIN_TOKEN`，在注册请求中带上 `x-cloudwarden-admin-token` 请求头。

个人部署建议创建首个账号后关闭开放注册。
