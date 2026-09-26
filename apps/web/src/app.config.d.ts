import type { ScriptProps } from 'next/script'

declare global {
  export interface AppThemeConfig {
    config: AppConfig
    footer: FooterConfig
  }

  export interface AccentColor {
    dark: string[]
    light: string[]
  }

  export interface AppConfig {
    color?: AccentColor
    custom?: Custom
    hero: Hero
    module: Module

    poweredBy?: {
      vercel?: boolean
    }

    site: Site
  }

  export interface LinkSection {
    links: {
      name: string
      href: string
      external?: boolean
    }[]
    name: string
  }

  export interface OtherInfo {
    date: string
    icp?: {
      text: string
      link: string
    }
  }

  export interface Custom {
    css: string[]
    js: string[]
    scripts: ScriptProps[]
    styles: string[]
  }

  export interface Site {
    favicon: string
    faviconDark?: string
  }
  export interface Hero {
    description: string
    hitokoto?: {
      random?: boolean
      custom?: string
    }
    title: Title
  }
  export interface Title {
    template: TemplateItem[]
  }
  export interface TemplateItem {
    class?: string
    style?: React.CSSProperties
    text?: string
    type: string
  }

  type RSSCustomElements = Array<Record<string, RSSCustomElements | string>>
  export interface Module {
    activity: {
      enable: boolean
      endpoint: string
    }
    bilibili: Bilibili
    donate: Donate
    liveDesk: {
      enable: boolean
    }
    og: {
      avatar?: string
    }
    openpanel: {
      enable: boolean
      id: string
      url: string
    }
    posts: {
      mode: 'loose' | 'compact'
    }
    rss: {
      custom_elements: RSSCustomElements
      noRSS?: boolean
    }

    signature: Signature

    subscription: {
      tg?: string
    }
  }
  export interface Donate {
    enable: boolean
    link: string
    qrcode: string[]
  }
  export interface Bilibili {
    liveId: number
  }

  export interface Signature {
    animated?: boolean
    svg: string
  }
}
