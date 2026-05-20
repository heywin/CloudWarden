# 导入 Bitwarden JSON

本文说明从 Bitwarden 导出的 JSON 文件导入 CloudWarden 的推荐流程。CloudWarden 已实现 `POST /api/ciphers/import`，官方客户端和 Web Vault 风格的批量导入请求可以直接落库。

## 导出 JSON

在 Bitwarden 官方客户端或 Web Vault 中：

1. 打开工具或设置中的导出功能。
2. 选择 JSON 格式。
3. 按需要选择加密或未加密导出。
4. 将导出的文件保存到本地安全目录。

导出文件包含高度敏感数据。导入完成后请及时删除明文导出文件，或存放在加密磁盘中。

## 推荐方式

最稳妥的方式是在 Bitwarden 官方客户端中把服务器切换到 CloudWarden，登录后使用客户端自带的导入功能。这样客户端会负责把明文导入数据重新加密，再把加密后的 folders/ciphers 发送到 CloudWarden。

CloudWarden 服务端不会解密你的密码库内容，也不会解析明文密码字段。未加密 JSON 只应短暂存在于你可信任的本地机器上。

## 导入方式

如果你已经拿到了客户端生成的 Bitwarden import payload，可以直接调用兼容接口：

```bash
curl -X POST "https://vault.example.com/api/ciphers/import" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  --data-binary @./bitwarden-import-payload.json
```

普通 Bitwarden 导出的未加密 JSON 不是这个接口的直接格式；请优先让官方客户端完成转换和加密。

## 导入前检查

- 已完成 D1 迁移。
- R2 bucket 可写。
- 已创建目标用户。
- 已备份当前 D1 数据库。
- 已确认导入策略：当前 CloudWarden 采用合并导入，不自动去重。

## 重复项处理

推荐默认策略：

| 场景 | 建议处理 |
| --- | --- |
| 相同条目 ID 已存在 | 当前会创建新条目 |
| 相同名称和用户名 | 保留两条，避免误删历史数据 |
| 文件夹不存在 | 自动创建 |
| 集合或组织不存在 | 个人模式下可降级为文件夹或跳过 |

## 导入后验证

1. 使用 Bitwarden 客户端登录 CloudWarden。
2. 手动同步。
3. 抽查登录项、安全笔记、银行卡、身份信息等类型。
4. 检查文件夹结构。
5. 检查附件是否可下载。

## 清理敏感文件

导入完成后，删除明文导出文件：

```bash
rm ./bitwarden-export.json
```

如果文件曾进入备份、同步盘或命令历史，请按对应平台的安全要求继续清理。
