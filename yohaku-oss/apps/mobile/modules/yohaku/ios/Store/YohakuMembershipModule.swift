import ExpoModulesCore
import StoreKit

@ExpoModule("YohakuMembership")
public final class YohakuMembershipModule: Module {
  private var membershipUpdatesTask: Task<Void, Never>?

  public override func didStartListening(event: String) {
    guard event == "onMembershipTransaction" else { return }
    membershipUpdatesTask?.cancel()
    membershipUpdatesTask = Task { [weak self] in
      for await result in Transaction.updates {
        guard !Task.isCancelled else { return }
        guard case .verified(let transaction) = result else { continue }
        self?.onMembershipTransaction([
          "productId": transaction.productID,
          "signedTransactionInfo": result.jwsRepresentation,
        ])
      }
    }
  }

  public override func didStopListening(event: String) {
    guard event == "onMembershipTransaction" else { return }
    membershipUpdatesTask?.cancel()
    membershipUpdatesTask = nil
  }

  public override func willDestroy() {
    membershipUpdatesTask?.cancel()
    membershipUpdatesTask = nil
  }

  @Event("onMembershipTransaction")
  var onMembershipTransaction: ([String: String]) -> Void

  public func definition() -> ModuleDefinition {
    Events("onMembershipTransaction")
  }

  @JS
  func presentSubscriptionStore(
    appAccountToken: String,
    productIds: [String],
    termsUrl: String,
    privacyUrl: String
  ) async throws -> [String: String] {
    let result = try await MembershipStore.present(
      productIds: productIds,
      appAccountToken: try MembershipStore.accountToken(from: appAccountToken),
      termsUrl: termsUrl,
      privacyUrl: privacyUrl
    )
    return [
      "status": result.status,
      "signedTransactionInfo": result.signedTransactionInfo,
    ]
  }

  @JS
  func currentEntitlementJws(appAccountToken: String, productIds: [String]) async throws -> [String] {
    try await MembershipStore.currentEntitlementJws(
      productIds: productIds,
      appAccountToken: try MembershipStore.accountToken(from: appAccountToken)
    )
  }

  @JS
  func unfinishedMembershipTransactionJws(appAccountToken: String, productIds: [String]) async throws -> [String] {
    try await MembershipStore.unfinishedTransactionJws(
      productIds: productIds,
      appAccountToken: try MembershipStore.accountToken(from: appAccountToken)
    )
  }

  @JS
  func finishMembershipTransaction(signedTransactionInfo: String) async {
    await MembershipStore.finishTransaction(signedTransactionInfo: signedTransactionInfo)
  }

  @JS
  func showManageSubscriptions() async throws {
    try await MembershipStore.showManageSubscriptions()
  }
}
