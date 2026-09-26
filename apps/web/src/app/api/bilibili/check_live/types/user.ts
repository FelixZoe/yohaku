export interface BLUser {
  code: number
  data: Data
  message: string
  msg: string
}
interface Data {
  info: UserInfo
  level: Level
  san: number
}
export interface UserInfo {
  face: string
  gender: number
  identification: number
  mobile_verify: number
  official_verify: Official_verify
  platform_user_level: number
  rank: string
  uid: number
  uname: string
  vip_type: number
}
interface Official_verify {
  desc: string
  role: number
  type: number
}
interface Level {
  anchor_score: number
  color: number
  cost: number
  master_level: Master_level
  rcost: number
  svip: number
  svip_time: string
  uid: number
  update_time: string
  user_level: number
  user_score: string
  vip: number
  vip_time: string
}
interface Master_level {
  anchor_score: number
  color: number
  current: number[]
  level: number
  master_level_color: number
  next: number[]
  sort: string
  upgrade_score: number
}
