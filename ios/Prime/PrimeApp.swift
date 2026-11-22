import SwiftUI

@main
struct PrimeApp: App {
    @State private var isLaunching = true
    @State private var isHome = false
    var body: some Scene {
        WindowGroup {
            PrimeWebView(isLaunching: $isLaunching, isHome: $isHome)
                // Extend only the background behind the system status bar.
                // Web content continues to respect the device's safe area.
                .background(Color(uiColor: isLaunching ? .white : isHome ? PrimeSurface.home : PrimeSurface.header)
                    .ignoresSafeArea(.container, edges: .top))
                .preferredColorScheme(.light)
        }
    }
}
