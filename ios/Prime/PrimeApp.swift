import SwiftUI

@main
struct PrimeApp: App {
    @State private var isLaunching = true
    @State private var usesRedHeader = false
    var body: some Scene {
        WindowGroup {
            PrimeWebView(isLaunching: $isLaunching, usesRedHeader: $usesRedHeader)
                // Extend only the background behind the system status bar.
                // Web content continues to respect the device's safe area.
                .background(Color(uiColor: isLaunching ? .white : usesRedHeader ? PrimeSurface.redHeader : PrimeSurface.header)
                    .ignoresSafeArea(.container, edges: .top))
                .preferredColorScheme(.light)
        }
    }
}
