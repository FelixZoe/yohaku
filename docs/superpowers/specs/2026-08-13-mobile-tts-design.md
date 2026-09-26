# Mobile TTS（听 + 跟读）

2026-08-13 · 状态：已批准

## 范围

把 web 的文章朗读接到 iOS app：听当前这篇、跟读高亮、锁屏可控。
不跨页续播、不按段点播、不缓存音频文件。

## 已定决策

- 产品：听 + 跟读。离开详情页立刻停；锁屏可继续控。
- 入口：导航栏喇叭（仅 `tts.available`）。播放中底部 Liquid Glass 浮岛。
- 播放器：`modules/yohaku/ios/Tts/` 薄 AVPlayer。JS 管排队、拉段、迷你条、跟读。
- 音频：`GET /tts/article/:id?lang=`，点喇叭才请求。meta 只持久化 `available` / `stale`。
- 跟读：WebView 画高亮，外层原生 ScrollView 滚。手动滑则让位，迷你条出 Recenter。
- 锁屏：播 / 暂停，标题 = 文章标题，副标题 = 余白。进度按当前段。
- 倍速：`1 / 1.25 / 1.5 / 1.75 / 2`。无进度条。
- iOS 26+ 用 `expo-glass-effect`；更早系统退回纸面底。

## 结构

```
详情页
  ├─ 导航栏喇叭
  ├─ useTtsSession          拉段 / 排队 / 状态
  ├─ Yohaku.tts (Swift)     AVPlayer + Now Playing
  ├─ TtsMiniBar             Liquid Glass 浮岛
  └─ ArticleBody
       highlightBlockId → WebView 高亮
       yohaku:blocks     → 原生 scrollTo
```

## 生命周期

点喇叭 → `activated` → fetch → `play` 第 0 段 → 预载下一段。
`ended` 接下一段；最后一段结束或 ✕ 或卸载 → `stop`，拆 session 和 Now Playing。
只暂停不清锁屏。

## 非目标

跨页迷你条、段旁播放、全文总时长、离线音频包、web 播放引擎抽包。
