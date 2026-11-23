import SwiftUI

@main
struct PrimeApp: App {
    @State private var isLaunching = true
    @State private var usesRedHeader = false
    var body: some Scene {
        WindowGroup {
            PrimeWebView(isLaunching: $isLaunching, usesRedHeader: $usesRedHeader)
                .background {
                    Color(uiColor: isLaunching || usesRedHeader ? PrimeSurface.redHeader : PrimeSurface.header)
                        .ignoresSafeArea(.container, edges: .top)
                }
                .background {
                    Color(uiColor: isLaunching ? PrimeSurface.redHeader : PrimeSurface.header)
                        .ignoresSafeArea(.container)
                }
                .preferredColorScheme(.light)
        }
    }
}
