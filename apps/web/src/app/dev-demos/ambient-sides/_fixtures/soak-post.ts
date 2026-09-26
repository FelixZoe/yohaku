import {
  doc,
  heading,
  image,
  paragraph,
  quote,
  text,
} from '../../lexical/_fixtures/helpers'

const photo = (
  seed: string,
  altText: string,
  caption: string,
  accent: string,
  thumbhash?: string,
) => ({
  ...image({
    accent,
    altText,
    caption,
    height: 620,
    src: `https://picsum.photos/seed/${seed}/1240/620`,
    width: 1240,
  }),
  thumbhash,
})

export const soakPostState = doc(
  heading('h1', text('单机 4 GB VPS 上把 GitLab CE 跑起来')),
  paragraph(
    text(
      '周末把闲置的一台 4 GB Lightsail 收编成内网 Git 仓库。中间踩了四个坑，最后落地的形状跟开始想的差不多，但每一步都比预期慢一拍。下面是这次部署的完整日志。',
    ),
  ),

  heading('h2', text('起意')),
  paragraph(
    text(
      '几年的 side project 散落在 GitHub 私库、本地裸 git 仓、几个 self-hosted Gitea 上。最近开始有一些需要 CI 的项目，Gitea Actions 用得别扭，干脆一次到位上 GitLab CE 自带 Runner。',
    ),
  ),
  photo(
    'yohaku-soak-dune',
    '落日与沙丘',
    '照片 · 落日与沙丘',
    '#c08a52',
    'pYmFAYIoL25VaHovVPlj1WdXgIiGSCg=',
  ),
  paragraph(
    text(
      '不打算讲 GitLab 和 Gitea / Forgejo 的选型。结论是：要 CI 就上 GitLab，对内存预算敏感就 Gitea + Drone。我这次主要是为 CI。',
    ),
  ),

  heading('h2', text('决定 topology')),
  paragraph(
    text(
      '单机跑 Omnibus，Caddy 做反代，备份丢到 R2。邮件走 Resend，省得自己养 SMTP，也省得跟各家的 IP 信誉打交道。',
    ),
  ),
  photo(
    'yohaku-soak-forest',
    '雨后的林道',
    '照片 · 雨后的林道',
    '#4b6b3a',
    '1QcSHQRnh493V4dIh4eXh1h4kJUI',
  ),
  paragraph(
    text(
      '第一次启动大概要六到八分钟，期间 502 是正常的。不要在这个阶段反复重启容器，reconfigure 跑到一半被打断会留下半截状态，后面排查起来非常烦。',
    ),
  ),

  heading('h2', text('内存怎么压下去的')),
  paragraph(
    text(
      'puma worker 从默认的 2 降到 1，sidekiq 并发从 25 降到 8。这两项加起来省了大约 900 MB，是收益最大的两个开关，别的调整相比之下都是零头。',
    ),
  ),
  paragraph(
    text(
      'Prometheus 那一整套监控直接关掉。自托管单人使用，指标采集的价值远低于它吃掉的三百多兆内存。要看状态 htop 就够了，真出事的时候你看的也不是 Grafana。',
    ),
  ),
  paragraph(
    text(
      'Gitaly 的 concurrency 也压了一档。仓库不大，克隆并发本来就上不去，留着默认值只是白占。',
    ),
  ),
  paragraph(
    text(
      'swap 开了 2 GB 做保险。正常负载下几乎不碰，但 CI 并发跑起来的时候顶过一次，有它在就不会 OOM 把整个实例带走。这 2 GB 是这台机器上性价比最高的一块空间。',
    ),
  ),

  heading('h2', text('SSH 端口那个坑')),
  paragraph(
    text(
      'Omnibus 默认把 git over ssh 挂在 22，和宿主机的 sshd 撞。要么改宿主机，要么改容器映射，二选一，别想着两个都留在 22。',
    ),
  ),
  paragraph(
    text(
      '我选了改宿主机 sshd 到 2222，因为 git 的 clone URL 里带非标端口非常难看，而且每个 client 都要配。宿主机的 ssh 只有我自己用，改了不影响别人。',
    ),
  ),
  quote(
    paragraph(
      text(
        '改完记得先开新窗口验证能连上再关掉旧连接。这条听起来像废话，但云上没有物理控制台的时候，它是你和一台砖头之间唯一的区别。',
      ),
    ),
  ),

  heading('h2', text('备份与恢复演练')),
  paragraph(
    text(
      '备份别只做不验。第一次恢复演练我才发现 secrets 文件没在备份清单里 —— 有 backup 没 secrets，等于有保险箱没钥匙，仓库数据全在但一条都读不出来。',
    ),
  ),
  paragraph(
    text(
      '定时任务丢给 cron，产物推到 R2，保留策略七天。恢复演练排进月度，跟续证书放在同一天做，省得记两件事。',
    ),
  ),
  paragraph(
    text(
      '以上这一整段没有配图，是特意留的：滚过来时余白的颜色应当退回保底，平铺一段，直到下一张图进场才重新起来。这段的长度大致相当于两屏半。',
    ),
  ),

  heading('h2', text('落地后看到的形状')),
  photo(
    'yohaku-soak-night',
    '夜里的招牌',
    '照片 · 夜里的招牌',
    '#8d5f9c',
    '3OcRJYB4d3h/iIeHeEh3eIhw+j2w',
  ),
  paragraph(
    text(
      '一周下来内存稳定在 3.2 GB 左右，CI 跑起来会顶到 3.8。再往上就要考虑加 swap 或者升配了，但目前够用。',
    ),
  ),
  photo('yohaku-soak-snow', '雪线之上', '照片 · 雪线之上', '#7d96a8'),
  paragraph(
    text(
      '回头看，四个坑里有三个是文档写了但我没读完，只有 SSH 那个是真的没写。这大概是自托管的常态：文档永远比你以为的详细，也永远比你需要的少一条。',
    ),
  ),
  paragraph(
    text(
      '最后一张图没有 thumbhash，只有 accent —— 用来验证降级路径：此时上下两色由 accent 在 OKLab 里分出明暗两极，而不是从缩略图采样。',
    ),
  ),
)
