# Bitwarden 客户端设置

CloudWarden 目标是兼容 Bitwarden 客户端的个人使用流程。不同客户端版本的入口文案可能略有差异。

## 服务器 URL

将 Bitwarden 客户端的服务器地址设置为 CloudWarden 的部署地址：

```text
https://vault.example.com
```

或 Workers 默认域名：

```text
https://cloudwarden.<your-subdomain>.workers.dev
```

不要在 URL 末尾添加多余路径，除非后续工程明确要求。

## 桌面客户端

1. 打开 Bitwarden 桌面客户端。
2. 在登录页选择服务器、自托管或齿轮设置入口。
3. 将 Server URL 设置为 CloudWarden 地址。
4. 返回登录页，使用 CloudWarden 账号登录。
5. 登录后手动触发一次同步，确认密码库条目正常显示。

## 浏览器扩展

1. 打开 Bitwarden 扩展。
2. 在登录界面选择服务器设置。
3. 填写 CloudWarden 地址。
4. 登录并同步。
5. 在一个测试网站保存和读取登录项，确认自动填充行为符合预期。

## 移动端

1. 在登录界面进入服务器设置。
2. 选择自托管环境。
3. 填写 CloudWarden 地址。
4. 登录并同步。

移动端可能对证书、重定向和跨域行为更敏感。生产环境请使用有效 HTTPS 证书和稳定域名。

## 故障排查

### 无法登录

- 确认客户端服务器 URL 与部署地址一致。
- 确认 Worker 可通过浏览器访问。
- 确认 D1 迁移已执行。
- 确认注册或账号初始化流程已完成。

### 可以登录但无法同步

- 查看 Worker 日志：

```bash
npx wrangler tail
```

- 确认 D1 绑定名和代码一致。
- 确认客户端时间与网络环境正常。

### 附件上传失败

- 确认 R2 bucket 已创建并绑定。
- 查看 Worker 日志中的 R2 写入错误。
