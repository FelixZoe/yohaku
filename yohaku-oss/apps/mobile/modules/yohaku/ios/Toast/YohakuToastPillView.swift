import UIKit

final class YohakuToastPillView: UIView {
  let message: String
  private let blur = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterial))
  private let check = UIImageView()
  private let label = UILabel()

  var showsContent = true {
    didSet {
      label.isHidden = !showsContent
      check.isHidden = !showsContent
      isAccessibilityElement = showsContent
      accessibilityElementsHidden = !showsContent
    }
  }

  init(message: String) {
    self.message = message
    super.init(frame: .zero)
    layer.cornerCurve = .continuous
    layer.shadowColor = UIColor.black.cgColor
    layer.shadowOpacity = 0.08
    layer.shadowRadius = 12
    layer.shadowOffset = CGSize(width: 0, height: 4)
    blur.clipsToBounds = true
    blur.layer.cornerCurve = .continuous
    addSubview(blur)

    label.text = message
    label.font = UIFontMetrics(forTextStyle: .subheadline).scaledFont(
      for: .systemFont(ofSize: 16, weight: .medium)
    )
    label.adjustsFontForContentSizeCategory = true
    label.textColor = .label
    label.numberOfLines = 0
    blur.contentView.addSubview(label)

    check.image = UIImage(systemName: "checkmark")?
      .withConfiguration(UIImage.SymbolConfiguration(pointSize: 16, weight: .semibold))
    check.tintColor = .systemGreen
    check.contentMode = .center
    blur.contentView.addSubview(check)
    isAccessibilityElement = true
    accessibilityIdentifier = "yohaku.toast"
    accessibilityLabel = message
    accessibilityTraits = .staticText
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  func fittedSize(maxWidth: CGFloat) -> CGSize {
    let text = label.sizeThatFits(
      CGSize(width: max(1, maxWidth - 64), height: .greatestFiniteMagnitude)
    )
    return CGSize(width: min(maxWidth, ceil(text.width) + 64), height: max(48, ceil(text.height) + 24))
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let radius = min(24, bounds.height / 2)
    layer.cornerRadius = radius
    layer.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: radius).cgPath
    blur.frame = bounds
    blur.layer.cornerRadius = radius
    label.frame = CGRect(x: 20, y: 12, width: max(0, bounds.width - 64), height: bounds.height - 24)
    check.frame = CGRect(x: bounds.width - 36, y: (bounds.height - 16) / 2, width: 16, height: 16)
  }
}
