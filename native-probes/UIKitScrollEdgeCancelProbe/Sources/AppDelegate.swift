import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let window = UIWindow(frame: UIScreen.main.bounds)
    let navigationController = UINavigationController(rootViewController: HomeViewController())
    navigationController.navigationBar.prefersLargeTitles = false
    window.rootViewController = navigationController
    window.makeKeyAndVisible()
    self.window = window
    return true
  }
}

final class HomeViewController: UIViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground

    let titleLabel = UILabel()
    titleLabel.font = .preferredFont(forTextStyle: .title1)
    titleLabel.text = "UIKit-only probe"

    let explanationLabel = UILabel()
    explanationLabel.font = .preferredFont(forTextStyle: .body)
    explanationLabel.numberOfLines = 0
    explanationLabel.text = "No React Native. No react-native-screens.\nOpen the detail page, drag back less than halfway, then release."

    var configuration = UIButton.Configuration.filled()
    configuration.title = "Open scroll edge probe"
    let button = UIButton(configuration: configuration)
    button.accessibilityIdentifier = "open-detail"
    button.addTarget(self, action: #selector(openDetail), for: .touchUpInside)

    let stack = UIStackView(arrangedSubviews: [titleLabel, explanationLabel, button])
    stack.axis = .vertical
    stack.spacing = 20
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)

    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
      stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
      stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])

  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    navigationController?.setNavigationBarHidden(true, animated: animated)
  }

  @objc private func openDetail() {
    navigationController?.pushViewController(DetailViewController(), animated: true)
  }
}

final class DetailViewController: UIViewController {
  private let scrollView = UIScrollView()
  private let statusLabel = UILabel()
  private var cancelCount = 0
  private var seededScrollPosition = false

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    navigationItem.title = "UIKit Detail"
    configureTransparentNavigationBar()
    configureScrollView()
    configureStatusLabel()
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    navigationController?.setNavigationBarHidden(false, animated: animated)
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)

    if !seededScrollPosition {
      seededScrollPosition = true
      view.layoutIfNeeded()
      scrollView.setContentOffset(CGPoint(x: 0, y: 150), animated: false)
    }
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)

    guard let coordinator = transitionCoordinator, coordinator.isInteractive else {
      return
    }

    statusLabel.text = "UIKit only • interaction active"
    print("PROBE_INTERACTION_BEGAN")

    coordinator.notifyWhenInteractionChanges { [weak self] context in
      guard let self else { return }
      if context.isCancelled {
        self.cancelCount += 1
        self.statusLabel.text = "UIKit only • CANCEL CONFIRMED #\(self.cancelCount)"
        print("PROBE_INTERACTION_CANCELLED count=\(self.cancelCount)")
      } else {
        self.statusLabel.text = "UIKit only • pop committed"
        print("PROBE_INTERACTION_COMMITTED")
      }
    }

    coordinator.animate(alongsideTransition: nil) { context in
      print("PROBE_TRANSITION_COMPLETED cancelled=\(context.isCancelled)")
    }
  }

  private func configureTransparentNavigationBar() {
    let appearance = UINavigationBarAppearance()
    appearance.configureWithTransparentBackground()
    appearance.backgroundColor = .clear
    appearance.shadowColor = .clear
    navigationItem.standardAppearance = appearance
    navigationItem.compactAppearance = appearance
    navigationItem.scrollEdgeAppearance = appearance
  }

  private func configureScrollView() {
    scrollView.alwaysBounceVertical = true
    scrollView.contentInsetAdjustmentBehavior = .always
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(scrollView)

    if #available(iOS 26.0, *) {
      scrollView.topEdgeEffect.isHidden = false
      scrollView.topEdgeEffect.style = .automatic
    }

    let content = UIStackView()
    content.axis = .vertical
    content.spacing = 0
    content.translatesAutoresizingMaskIntoConstraints = false
    scrollView.addSubview(content)

    for index in 1...80 {
      let row = UILabel()
      row.font = .monospacedSystemFont(ofSize: 17, weight: .semibold)
      row.text = "   NATIVE UIKIT ROW \(String(format: "%02d", index))"
      row.textColor = index.isMultiple(of: 2) ? .white : .black
      row.backgroundColor = index.isMultiple(of: 2) ? .systemIndigo : .systemYellow
      row.heightAnchor.constraint(equalToConstant: 46).isActive = true
      content.addArrangedSubview(row)
    }

    NSLayoutConstraint.activate([
      scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      scrollView.topAnchor.constraint(equalTo: view.topAnchor),
      scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      content.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
      content.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
      content.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
      content.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
      content.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor),
    ])
  }

  private func configureStatusLabel() {
    statusLabel.accessibilityIdentifier = "probe-status"
    statusLabel.backgroundColor = UIColor.black.withAlphaComponent(0.82)
    statusLabel.layer.cornerRadius = 14
    statusLabel.clipsToBounds = true
    statusLabel.font = .monospacedSystemFont(ofSize: 13, weight: .bold)
    statusLabel.text = "UIKit only • cancel count: 0"
    statusLabel.textAlignment = .center
    statusLabel.textColor = .white
    statusLabel.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(statusLabel)

    NSLayoutConstraint.activate([
      statusLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      statusLabel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
      statusLabel.heightAnchor.constraint(equalToConstant: 36),
      statusLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 300),
    ])
  }
}
