# 0.5：发现推荐与未签名 IPA

用户的“发布页”暂按书源里的发现 / 榜单推荐页理解；如实际是另一个网站，需要提供网址再适配。

## 已接入的推荐流程

- 底栏“发现”进入实时书源推荐，默认使用已导入的大灰狼 5.9.30。
- 可切换平台、男频 / 女频、排行榜 / 热门标签及具体分类，支持刷新与加载更多。
- 点击书籍可查看封面、作者、简介与来源，再加入书架阅读；仍使用书源授权会话读取付费正文。
- “我的书签”移到设置页，原书签功能保留。
- 只接受当前所选线路的小说发现接口，不执行发现页 JS，不跟随第三方脚本入口。

2026-10-26 实际接口验证：读取到 181 个有效分类，推荐榜返回 21 本书，首本目录返回 447 章，并成功解析简介。没有请求付费正文。

业务测试共 19 项通过，包括发现入口过滤、分页参数、推荐书籍到目录的衔接。网页预览使用明确标注的示例数据，不把示例推荐作为真实榜单。

## 未签名 IPA

用户已选择自行签名。已准备 `scripts/build-ios-unsigned.sh` 和 `.github/workflows/ios-unsigned.yml`。

本机 Mac：需要 Xcode / iOS 26 SDK、CocoaPods、Node.js，在项目根目录运行：

```bash
bash scripts/build-ios-unsigned.sh
```

成功时输出 `artifacts/Qidu-unsigned.ipa`，随后由用户自行签名安装。该脚本禁止代码签名，不需要把苹果证书或密码写入源码。

GitHub Actions：把项目放入用户自己的仓库，手动运行 “Build unsigned iOS IPA”。工作流使用 macOS runner，读取当前仓库，上传构建文件；以仓库账号的额度和 runner 配置为准。若 runner 默认 Xcode 过旧，需选用有 iOS 26 SDK 的构建环境。

**当前未执行 macOS 原生构建，没有 IPA 文件**。已通过的 JavaScript bundle 导出不等于 Xcode 原生构建或真机验证。工作流与脚本是构建入口，不是已经成功的构建结果。

工作流参考：[checkout](https://github.com/actions/checkout)、[setup-node](https://github.com/actions/setup-node)、[upload-artifact](https://github.com/actions/upload-artifact)。
