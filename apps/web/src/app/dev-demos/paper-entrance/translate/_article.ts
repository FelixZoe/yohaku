export type ArticleLang = 'zh' | 'en' | 'ja'

export const ARTICLE_LANG_LABEL: Record<ArticleLang, string> = {
  zh: '中文（原文）',
  en: 'English',
  ja: '日本語',
}

export const ARTICLE: Record<
  ArticleLang,
  { date: string; title: string; paragraphs: string[] }
> = {
  zh: {
    date: '2026 年 9 月 28 日 · 晴',
    title: '秋分之后的第一场雨',
    paragraphs: [
      '傍晚下了雨，窗外的桂花一下子全落了。拿出去年秋天没写完的本子，翻到折角那一页，字迹已经淡得有些认不出。',
      '有些事当时觉得非记不可，过了一年再看，只剩下纸页边缘被手指磨出的毛边，和一点说不清的潮气。',
      '我试着回想那天为什么要把这一页折起来。大概是某个下午，在车站等一班晚点的车，随手写下几句关于光线的话。现在读来，光线早就不在了，只有等待的那种心情还留在纸上。',
      '后来才明白，写字这件事，最后留下来的往往不是内容，而是写的时候的姿势：手腕压着纸，笔尖停顿，窗外有人走过。',
      '雨一直没停。我把本子摊在桌上，让它吸一点潮气，好像这样那些淡掉的字就能重新洇开。',
      '于是又在下面接着写了一行。',
    ],
  },
  en: {
    date: 'September 28, 2026 · Clear',
    title: 'The First Rain After the Equinox',
    paragraphs: [
      'It rained in the evening, and the osmanthus outside the window fell all at once. I took out last autumn’s unfinished notebook and turned to the dog-eared page; the handwriting had faded almost past recognition.',
      'Some things felt impossible not to write down at the time. A year later, all that remains is the frayed edge my fingers wore into the page, and a dampness I can’t quite name.',
      'I tried to remember why I folded that page. Probably some afternoon at the station, waiting for a late train, jotting a few lines about the light. Reading it now, the light is long gone; only the feeling of waiting is still on the paper.',
      'Only later did I understand that what writing leaves behind is rarely the content, but the posture of writing: the wrist pressed on the page, the pen pausing, someone passing by the window.',
      'The rain never stopped. I left the notebook open on the desk to let it take in a little damp, as if the faded words might bleed back into the paper.',
      'So I wrote one more line beneath them.',
    ],
  },
  ja: {
    date: '2026年9月28日・晴れ',
    title: '秋分のあとの最初の雨',
    paragraphs: [
      '夕方に雨が降り、窓の外の金木犀がいっせいに散った。去年の秋に書きかけたノートを取り出し、折り目のついたページを開くと、文字はもう読めないほど薄れていた。',
      'あのときは書き留めずにはいられなかったことも、一年たって読み返すと、指でこすれて毛羽立った紙の端と、言葉にしがたい湿り気しか残っていない。',
      'なぜこのページを折ったのか思い出そうとした。たぶん駅で遅れた電車を待ちながら、光について数行書きつけた午後だったのだろう。いま読むと光はとうに消え、待っていた気持ちだけが紙に残っている。',
      '書くということが最後に残すのは、たいてい内容ではなく、書いていたときの姿勢なのだと後になって知った。紙に押しつけた手首、止まるペン先、窓の外を通り過ぎる人。',
      '雨はやまなかった。ノートを机に広げたまま少し湿気を吸わせておく。そうすれば薄れた文字がまた滲み出してくるような気がして。',
      'それで、その下にもう一行書き足した。',
    ],
  },
}
