import UIKit

enum YohakuToastOverlay {
  static let shared = Host()

  final class Host {
    fileprivate var window: PassThroughWindow?
    fileprivate let canvas = Canvas()

    func show(message: String) {
      guard !message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
      attachIfNeeded()
      window?.isHidden = false
      window?.layoutIfNeeded()
      canvas.enqueue(message)
    }
  }

  fileprivate final class PassThroughWindow: UIWindow {
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
      let hit = super.hitTest(point, with: event)
      if hit == self || hit == rootViewController?.view { return nil }
      return hit
    }
  }

  fileprivate final class Canvas: UIView {
    private var pills: [YohakuToastPillView] = []
    private var timer: Timer?
    private var dragOffset: CGFloat = 0

    override init(frame: CGRect) {
      super.init(frame: frame)
      backgroundColor = .clear
      isOpaque = false
      addGestureRecognizer(UIPanGestureRecognizer(target: self, action: #selector(handlePan)))
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
      fatalError("init(coder:) has not been implemented")
    }

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
      let hit = super.hitTest(point, with: event)
      return hit === self ? nil : hit
    }

    func enqueue(_ message: String) {
      if pills.last?.message == message {
        restartTimer()
        return
      }
      let pill = YohakuToastPillView(message: message)
      addSubview(pill)
      pills.append(pill)
      while pills.count > 3 {
        pills.removeFirst().removeFromSuperview()
      }
      dragOffset = 0
      layoutPills(entering: pill)
      restartTimer()
      UIAccessibility.post(notification: .announcement, argument: message)
      UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    override func layoutSubviews() {
      super.layoutSubviews()
      layoutPills()
    }

    private func layoutPills(entering: YohakuToastPillView? = nil) {
      guard let front = pills.last else { return }
      let reduced = UIAccessibility.isReduceMotionEnabled
      let size = front.fittedSize(maxWidth: min(bounds.width - 32, 360))
      for (index, pill) in pills.reversed().enumerated() {
        let depth = CGFloat(index)
        let scale = 1 - depth * 0.05
        let center = CGPoint(
          x: bounds.midX,
          y: safeAreaInsets.top + 8 + size.height / 2 + depth * 6 + dragOffset
        )
        pill.isUserInteractionEnabled = index == 0
        pill.showsContent = index == 0
        pill.layer.zPosition = CGFloat(3 - index)
        if pill === entering {
          pill.bounds = CGRect(origin: .zero, size: size)
          pill.center = center
          pill.transform = reduced ? .identity : CGAffineTransform(translationX: 0, y: -10)
            .scaledBy(x: 0.96, y: 0.96)
          pill.alpha = 0
        }
        let changes = {
          pill.bounds = CGRect(origin: .zero, size: size)
          pill.center = center
          pill.transform = CGAffineTransform(scaleX: scale, y: scale)
          pill.alpha = 1 - depth * 0.12
        }
        if entering != nil && !reduced {
          UIView.animate(
            withDuration: 0.35, delay: 0,
            usingSpringWithDamping: 0.88, initialSpringVelocity: 0,
            options: [.beginFromCurrentState, .allowUserInteraction], animations: changes
          )
        } else {
          changes()
        }
      }
    }

    private func restartTimer() {
      timer?.invalidate()
      // VoiceOver needs time to finish announcing the message before its element disappears.
      let duration: TimeInterval = UIAccessibility.isVoiceOverRunning ? 5 : 2.5
      timer = Timer.scheduledTimer(withTimeInterval: duration, repeats: false) { [weak self] _ in
        self?.dismiss()
      }
    }

    private func dismiss() {
      timer?.invalidate()
      timer = nil
      let departing = pills
      pills.removeAll()
      dragOffset = 0
      for pill in departing { pill.isUserInteractionEnabled = false }
      UIView.animate(
        withDuration: UIAccessibility.isReduceMotionEnabled ? 0 : 0.2,
        delay: 0, options: [.beginFromCurrentState, .curveEaseIn]
      ) {
        for pill in departing {
          pill.alpha = 0
          pill.transform = pill.transform.translatedBy(x: 0, y: -6)
        }
      } completion: { [weak self] _ in
        departing.forEach { $0.removeFromSuperview() }
        if self?.subviews.isEmpty == true {
          YohakuToastOverlay.shared.window?.isHidden = true
        }
      }
    }

    override func accessibilityPerformEscape() -> Bool {
      guard !pills.isEmpty else { return false }
      dismiss()
      return true
    }

    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
      let translation = gesture.translation(in: self).y
      switch gesture.state {
      case .began:
        timer?.invalidate()
      case .changed:
        dragOffset = translation < 0 ? translation : translation / (translation + 120) * 40
        layoutPills()
      case .ended, .cancelled:
        if gesture.state == .ended && (translation < -40 || gesture.velocity(in: self).y < -600) {
          dismiss()
        } else {
          dragOffset = 0
          UIView.animate(
            withDuration: UIAccessibility.isReduceMotionEnabled ? 0 : 0.3,
            delay: 0, usingSpringWithDamping: 0.88, initialSpringVelocity: 0,
            options: [.beginFromCurrentState, .allowUserInteraction]
          ) { self.layoutPills() }
          restartTimer()
        }
      default:
        break
      }
    }
  }
}

extension YohakuToastOverlay.Host {
  fileprivate func attachIfNeeded() {
    if window != nil { return }
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    guard
      let scene = scenes.first(where: { $0.activationState == .foregroundActive })
      ?? scenes.first
    else { return }
    let win = YohakuToastOverlay.PassThroughWindow(windowScene: scene)
    win.windowLevel = .alert + 1
    win.backgroundColor = .clear
    win.frame = scene.coordinateSpace.bounds
    let root = UIViewController()
    root.view.backgroundColor = .clear
    canvas.frame = win.bounds
    canvas.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    root.view.addSubview(canvas)
    win.rootViewController = root
    win.isHidden = false
    window = win
  }
}
