import SwiftUI

@main
struct PrimeApp: App {
    var body: some Scene {
        WindowGroup {
            PrimeWebView()
                .background(Color.white)
                .preferredColorScheme(.light)
        }
    }
}
