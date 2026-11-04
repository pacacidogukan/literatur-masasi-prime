import SwiftUI

@main
struct PrimeApp: App {
    @State private var comparison: CampaignComparison?

    var body: some Scene {
        WindowGroup {
            PrimeWebView { comparison = $0 }
                .background(Color.white)
                .preferredColorScheme(.light)
                .sheet(item: $comparison) { CampaignComparisonView(comparison: $0) }
        }
    }
}

struct ComparableCampaign: Decodable, Identifiable {
    let id: String
    let brand: String
    let title: String
    let terms: String
    let expires: TimeInterval
    let hasCode: Bool
    let channel: String

    var isActive: Bool {
        expires == 0 || expires > Date().timeIntervalSince1970
    }

    var expiryLabel: String {
        guard expires > 0 else { return "Tarih paylaşılmadı" }
        let format = Date.FormatStyle(date: .abbreviated, time: .shortened,
                                      locale: Locale(identifier: "tr_TR"),
                                      timeZone: TimeZone(identifier: "Europe/Istanbul") ?? .current)
        return Date(timeIntervalSince1970: expires).formatted(format) + " (TSİ)"
    }
}

struct CampaignComparison: Identifiable {
    let id = UUID()
    let first: ComparableCampaign
    let alternatives: [ComparableCampaign]
}

private struct CampaignComparisonView: View {
    let comparison: CampaignComparison
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var second: ComparableCampaign?
    @State private var query = ""

    private var choices: [ComparableCampaign] {
        comparison.alternatives.filter { campaign in
            campaign.id != comparison.first.id && campaign.isActive &&
            (query.isEmpty || "\(campaign.brand) \(campaign.title)".localizedStandardContains(query))
        }
    }

    var body: some View {
        NavigationView {
            List {
                if let second {
                    Section {
                        comparisonRow("Marka", comparison.first.brand, second.brand)
                        comparisonRow("Teklif", comparison.first.title, second.title)
                        comparisonRow("Satış kanalı", comparison.first.channel, second.channel)
                        comparisonRow("Kampanya kodu", codeLabel(comparison.first), codeLabel(second))
                        comparisonRow("Bitiş tarihi", comparison.first.expiryLabel, second.expiryLabel)
                        comparisonRow("Koşullar", comparison.first.terms, second.terms)
                    }
                    Section {
                        Button("İkinci kampanyayı değiştir") { self.second = nil }
                    }
                } else {
                    Section("Seçili kampanya") {
                        campaignLabel(comparison.first)
                    }
                    Section("İkinci kampanyayı seç") {
                        TextField("Marka veya teklif ara", text: $query)
                        if choices.isEmpty {
                            Text("Karşılaştırılabilecek kampanya bulunamadı.")
                                .foregroundStyle(.secondary)
                        }
                        ForEach(choices) { campaign in
                            Button {
                                query = ""
                                second = campaign
                            } label: {
                                campaignLabel(campaign)
                            }
                            .accessibilityIdentifier("compare-option-\(campaign.id)")
                        }
                    }
                }
            }
            .navigationTitle("Kampanya karşılaştır")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Kapat") { dismiss() }
                }
            }
        }
        .navigationViewStyle(.stack)
    }

    private func campaignLabel(_ campaign: ComparableCampaign) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(campaign.brand).font(.headline)
            Text(campaign.title).font(.subheadline).foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }

    private func codeLabel(_ campaign: ComparableCampaign) -> String {
        campaign.hasCode ? "Kod var" : "Kod gerekmiyor"
    }

    private func comparisonRow(_ heading: String, _ first: String, _ second: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(heading).font(.subheadline.weight(.semibold)).accessibilityAddTraits(.isHeader)
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 12) { comparisonValues(first, second) }
            } else {
                HStack(alignment: .top, spacing: 14) { comparisonValues(first, second) }
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func comparisonValues(_ first: String, _ second: String) -> some View {
        comparisonValue(first, column: "Birinci kampanya")
        comparisonValue(second, column: "İkinci kampanya")
    }

    private func comparisonValue(_ value: String, column: String) -> some View {
        let label = value.isEmpty ? "Bilgi paylaşılmadı" : value
        return Text(label)
            .font(.subheadline)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityLabel("\(column): \(label)")
    }
}
