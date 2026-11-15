import SwiftUI

@main
struct PrimeApp: App {
    var body: some Scene {
        WindowGroup {
            PrimeWebView()
                // Extend only the background behind the system status bar.
                // Web content continues to respect the device's safe area.
                .background(Color(uiColor: PrimeSurface.header)
                    .ignoresSafeArea(.container, edges: .top))
                .preferredColorScheme(.light)
        }
    }
}
