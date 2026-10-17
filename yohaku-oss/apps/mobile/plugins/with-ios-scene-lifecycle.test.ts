import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertSceneTemplate,
  sceneDelegateSource,
} from './with-ios-scene-lifecycle.cjs'

const expoAppDelegate =
  'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {}'
const expoSceneDelegate = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`

describe('iOS scene lifecycle generation', () => {
  it('extends the Expo scene delegate instead of starting React Native itself', () => {
    expect(sceneDelegateSource).toContain(
      'class SceneDelegate: ExpoAppSceneDelegate',
    )
    expect(sceneDelegateSource).not.toContain('startReactNative')
  })

  it('accepts the Expo SDK 58 template and its own output', () => {
    expect(() =>
      assertSceneTemplate(expoAppDelegate, expoSceneDelegate),
    ).not.toThrow()
    expect(() =>
      assertSceneTemplate(expoAppDelegate, sceneDelegateSource),
    ).not.toThrow()
  })

  it('rejects a template without the Expo scene delegate', () => {
    expect(() =>
      assertSceneTemplate('class AppDelegate: ExpoAppDelegate {}', ''),
    ).toThrow(/ExpoReactNativeFactoryProvider/)
    expect(() =>
      assertSceneTemplate(
        expoAppDelegate,
        'class SceneDelegate: UIResponder {}',
      ),
    ).toThrow(/ExpoAppSceneDelegate/)
  })

  it('restores the scene route only when no incoming link takes priority', () => {
    expect(sceneDelegateSource).toContain('session.stateRestorationActivity')
    const urlContexts = sceneDelegateSource.indexOf(
      'if !connectionOptions.urlContexts.isEmpty',
    )
    const notification = sceneDelegateSource.indexOf(
      'if let notificationURL = notificationURL(',
    )
    const browsingWeb = sceneDelegateSource.indexOf('if browsingWebActivity')
    const restoration = sceneDelegateSource.indexOf(
      'return SceneRestoration.restorationURL',
    )

    expect(urlContexts).toBeGreaterThan(-1)
    expect(urlContexts).toBeLessThan(notification)
    expect(notification).toBeLessThan(browsingWeb)
    expect(browsingWeb).toBeLessThan(restoration)
  })

  it('primes Expo Linking before the Expo scene delegate starts React Native', () => {
    const prime = sceneDelegateSource.indexOf(
      'ExpoAppDelegateSubscriberManager.application(',
    )
    const superConnect = sceneDelegateSource.indexOf(
      'super.scene(scene, willConnectTo: session, options: connectionOptions)',
    )

    expect(prime).toBeGreaterThan(-1)
    expect(prime).toBeLessThan(superConnect)
  })

  it('opens a cold-start notification target as the initial Expo route', () => {
    expect(sceneDelegateSource).toContain('userInfo["target_path"]')
    expect(sceneDelegateSource).toContain('$0 == Bundle.main.bundleIdentifier')
  })

  it('archives committed routes in the scene session', () => {
    expect(sceneDelegateSource).toContain(
      '@objc func stateRestorationActivity(for scene: UIScene) -> NSUserActivity?',
    )
    expect(sceneDelegateSource).toContain('scene.userActivity')
    expect(sceneDelegateSource).toContain('YohakuRestorableRouteDidChange')
  })

  it('tries a restored route once until JavaScript commits a successful frame', () => {
    expect(sceneDelegateSource).toContain('restorationAttempted')
    expect(sceneDelegateSource).toContain('UserDefaults.standard.set(true')
    expect(sceneDelegateSource).toContain('UserDefaults.standard.removeObject')
  })

  it('bridges a committed Expo route to the active scene', async () => {
    const moduleSource = await readFile(
      path.resolve(
        import.meta.dirname,
        '../modules/yohaku/ios/YohakuModule.swift',
      ),
      'utf8',
    )
    expect(moduleSource).toContain('AsyncFunction("setRestorableRoute")')
    expect(moduleSource).toContain('YohakuRestorableRouteDidChange')
    expect(moduleSource).toContain('["routeURL": routeURL]')
  })
})
