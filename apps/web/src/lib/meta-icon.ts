const weatherHueMap: Record<string, string> = {
  晴: '#d4a056',
  多云: '#a8b0b8',
  阴: '#9aa0a8',
  雪: '#c8d0d8',
  雨: '#6e8fa5',
  雷雨: '#5b6478',
}

const moodHueMap: Record<string, string> = {
  开心: '#c56473',
  激动: '#d97d56',
  伤心: '#7a8893',
  大哭: '#5e6b78',
  悲哀: '#7d7065',
  不快: '#8a8579',
  生气: '#a64953',
  可恶: '#8b3a3e',
  痛苦: '#6b3a3e',
  担心: '#a8896a',
  焦虑: '#a8745b',
  绝望: '#5c5048',
  可怕: '#6b5b48',
}

const FALLBACK_HUE = 'var(--color-neutral-6)'

const weatherTranslationKeyMap: Record<string, string> = {
  晴: 'weather_sunny',
  多云: 'weather_cloudy',
  阴: 'weather_overcast',
  雪: 'weather_snow',
  雨: 'weather_rain',
  雷雨: 'weather_thunderstorm',
}

const moodTranslationKeyMap: Record<string, string> = {
  开心: 'mood_happy',
  伤心: 'mood_sad',
  大哭: 'mood_crying',
  生气: 'mood_angry',
  痛苦: 'mood_pain',
  悲哀: 'mood_sorrow',
  不快: 'mood_unhappy',
  激动: 'mood_excited',
  担心: 'mood_worried',
  可怕: 'mood_scary',
  可恶: 'mood_hateful',
  绝望: 'mood_despair',
  焦虑: 'mood_anxious',
}

export const weather2hue = (weather: string): string =>
  weatherHueMap[weather] ?? FALLBACK_HUE

export const mood2hue = (mood: string): string =>
  moodHueMap[mood] ?? FALLBACK_HUE

export const getWeatherLabel = (
  weather: string,
  t: (key: string) => string,
) => {
  const key = weatherTranslationKeyMap[weather]
  return key ? t(key) : weather
}

export const getMoodLabel = (mood: string, t: (key: string) => string) => {
  const key = moodTranslationKeyMap[mood]
  return key ? t(key) : mood
}
