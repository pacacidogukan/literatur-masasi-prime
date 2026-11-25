import SwiftUI

@main
struct PrimeApp: App {
    @State private var isLaunching = true
    @State private var usesRedHeader = false
    @State private var dimmedHeader = false
    var body: some Scene {
        WindowGroup {
            PrimeWebView(isLaunching: $isLaunching, usesRedHeader: $usesRedHeader, dimmedHeader: $dimmedHeader)
                .background {
                    Color(uiColor: isLaunching || usesRedHeader ? PrimeSurface.redHeader : PrimeSurface.header)
                        .overlay(Color.black.opacity(dimmedHeader ? 0.4 : 0))
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
