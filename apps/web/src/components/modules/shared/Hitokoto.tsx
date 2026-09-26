import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'

import { MotionButtonBase } from '~/components/ui/button'
import { LoadingMark } from '~/components/ui/loading/LoadingMark'
import { toast } from '~/lib/toast'

export const Hitokoto = () => {
  const t = useTranslations('common')
  const locale = useLocale()
  const {
    data: hitokoto,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['hitokoto', locale],
    queryFn: () => fetchQuoteByLocale(locale),
    refetchInterval: 1000 * 60 * 60 * 24,
    staleTime: Infinity,
    select(data) {
      if (!data) return t('hitokoto_no_data')
      return data
    },
  })

  if (!hitokoto) return null
  if (isLoading) return <LoadingMark size="md" />
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="leading-normal">{hitokoto}</span>
      <div className="ml-0 flex items-center space-x-2">
        <MotionButtonBase onClick={() => refetch()}>
          <i className="i-mingcute-refresh-2-line" />
        </MotionButtonBase>

        <MotionButtonBase
          onClick={() => {
            navigator.clipboard.writeText(hitokoto)
            toast.success(t('hitokoto_copy_success'))
            toast.info(hitokoto)
          }}
        >
          <i className="i-mingcute-copy-line" />
        </MotionButtonBase>
      </div>
    </div>
  )
}

enum SentenceType {
  '其他' = 'g',
  '动画' = 'a',
  '原创' = 'e',
  '哲学' = 'k',
  '影视' = 'h',
  '抖机灵' = 'l',
  '文学' = 'd',
  '来自网络' = 'f',
  '游戏' = 'c',
  '漫画' = 'b',
  '网易云' = 'j',
  '诗词' = 'i',
}

/** Fetch quote from Hitokoto (Chinese) */
const fetchHitokoto = async (
  type: SentenceType[] | SentenceType = SentenceType.文学,
) => {
  const res = await fetch(
    `https://v1.hitokoto.cn/${
      Array.isArray(type)
        ? `?${type.map((t) => `c=${t}`).join('&')}`
        : `?c=${type}`
    }`,
  )
  const data = (await res.json()) as {
    hitokoto: string
    from: string
    from_who: string
    creator: string
  }
  const postfix = [data.from, data.from_who, data.creator].find(Boolean)
  return data.hitokoto
    ? `${data.hitokoto}${postfix ? ` —— ${postfix}` : ''}`
    : null
}

/** Fetch quote from 名言教えるよ (Japanese) */
const fetchMeigen = async (): Promise<string | null> => {
  const res = await fetch('https://meigen.doodlenote.net/api/json.php?c=1')
  const arr = (await res.json()) as Array<{ meigen: string; auther: string }>
  const item = arr?.[0]
  if (!item?.meigen) return null
  const postfix = item.auther || ''
  return postfix ? `${item.meigen} —— ${item.auther}` : item.meigen
}

/** Fetch quote from DummyJSON (English) */
const fetchEnglishQuote = async (): Promise<string | null> => {
  const res = await fetch('https://dummyjson.com/quotes/random')
  if (!res.ok) return null
  const item = (await res.json()) as { quote: string; author: string }
  if (!item?.quote) return null
  return item.author ? `${item.quote} —— ${item.author}` : item.quote
}

/** Fetch quote by locale: zh→Hitokoto, ja→Meigen, en→Quotable */
export const fetchQuoteByLocale = async (
  locale: string,
): Promise<string | null> => {
  try {
    switch (locale) {
      case 'ja': {
        return await fetchMeigen()
      }
      case 'en': {
        return await fetchEnglishQuote()
      }
      default: {
        return await fetchHitokoto([
          SentenceType.动画,
          SentenceType.原创,
          SentenceType.哲学,
          SentenceType.文学,
        ])
      }
    }
  } catch {
    return null
  }
}
