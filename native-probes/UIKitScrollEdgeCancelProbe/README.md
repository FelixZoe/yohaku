# UIKit Scroll Edge Cancel Probe

This is a standalone UIKit application. It does not link React Native or
react-native-screens.

1. Generate the project with `xcodegen generate`.
2. Build and launch `UIKitScrollEdgeCancelProbe` on an iOS 26 Simulator.
3. Tap **Open scroll edge probe**.
4. Drag from the leading edge less than halfway across the screen and release.

The bottom status pill changes to `CANCEL CONFIRMED` only after UIKit reports
that the interactive transition was cancelled. The colored rows make the
native top scroll-edge effect easy to inspect during the rewind animation.
