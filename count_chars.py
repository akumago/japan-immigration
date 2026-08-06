import os
import re

PAGE_FILES = {
    "/": "HomePage.tsx",
    "/analysis-archive": "AnalysisArchive.tsx",
    "/analysis/crime-statistics": "CrimeStatistics.tsx",
    "/analysis/economic-impact": "EconomicImpact.tsx",
    "/analysis/social-security": "SocialSecurity.tsx",
    "/analysis/naturalization-paradox": "NaturalizationParadox.tsx",
    "/analysis/burial-controversy": "BurialControversy.tsx",
    "/analysis/land-acquisition": "LandAcquisition.tsx",
    "/analysis/uk-immigration-lesson": "UKImmigrationLesson.tsx",
    "/analysis/national-security": "NationalSecurity.tsx",
    "/analysis/nigeria-case": "NigeriaCase.tsx",
    "/analysis/ai-simulation": "AISimulation.tsx",
    "/analysis/labor-dilemma": "LaborDilemma.tsx",
    "/analysis/video-guide": "VideoGuide.tsx",
    "/analysis/statistical-evidence": "StatisticalEvidence.tsx",
    "/analysis/risk-analysis": "RiskAnalysis.tsx",
    "/analysis/labor-mismatch": "LaborMismatch.tsx",
    "/analysis/summary-statistics": "SummaryStatistics.tsx",
    "/analysis/policy-recommendations": "PolicyRecommendations.tsx",
    "/analysis/conclusion": "Conclusion.tsx",
    "/analysis/strategic-recommendations": "StrategicRecommendations.tsx",
}

PAGES_DIR = r"C:\Users\atusi\Downloads\日本の岐路：外国人移民がもたらす\pages"
CONSTANTS_FILE = r"C:\Users\atusi\Downloads\日本の岐路：外国人移民がもたらす\constants.tsx"
DATA_FILE = r"C:\Users\atusi\Downloads\日本の岐路：外国人移民がもたらす\data\slideData.ts"
OUTPUT_FILE = r"C:\Users\atusi\Downloads\日本の岐路：外国人移民がもたらす\char_counts.txt"

def clean_count(text_list):
    full_text = "".join(text_list)
    return len(re.sub(r"\s+", "", full_text))

def extract_from_tsx(file_content):
    texts = []
    # 1. blocks 内の text: "..."
    texts.extend(re.findall(r"text:\s*['\"`](.*?)['\"`]", file_content, re.DOTALL))
    # 2. JSX タグ直下のテキスト
    texts.extend(re.findall(r">([^<{ ]+[^<{]*?)<", file_content))
    # 3. title, description プロパティ (Helmet等)
    texts.extend(re.findall(r"title=['\"`](.*?)['\"`]", file_content))
    texts.extend(re.findall(r"content=['\"`](.*?)['\"`]", file_content))
    return texts

results = []

# HomePage content (constants.tsx)
if os.path.exists(CONSTANTS_FILE):
    with open(CONSTANTS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
        # reportData 全体からテキストを抽出
        report_data_match = re.search(r"export const reportData: ReportData = \{(.*?)\};", content, re.DOTALL)
        if report_data_match:
            texts = extract_from_tsx(report_data_match.group(1))
            count = clean_count(texts)
            status = "OK" if count >= 2000 else "UNDER 2000"
            results.append(f"{'/':<45} | HomePage (via constants)       | {count:<10} | {status}")
else:
    results.append(f"{'/':<45} | constants.tsx NOT FOUND        | -          | -")

# Other Pages
for url, filename in PAGE_FILES.items():
    if url == "/": continue
    filepath = os.path.join(PAGES_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            texts = extract_from_tsx(content)
            count = clean_count(texts)
            status = "OK" if count >= 2000 else "UNDER 2000"
            results.append(f"{url:<45} | {filename:<30} | {count:<10} | {status}")
    else:
        results.append(f"{url:<45} | {filename:<30} | {'NOT FOUND':<10} | -")

# slideData.ts (Image Pages)
if os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
        desc_matches = re.findall(r"description:\s*['\"`](.*?)['\"`]", content, re.DOTALL)
        for i, desc in enumerate(desc_matches):
            count = len(re.sub(r"\s+", "", desc))
            url = f"/analysis/image/{i+1}"
            status = "OK" if count >= 2000 else "UNDER 2000"
            results.append(f"{url:<45} | slideData.ts (ID:{i+1})      | {count:<10} | {status}")

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write(f"{'URL':<45} | {'Source':<30} | {'Char Count':<10} | {'Status'}\n")
    f.write("-" * 110 + "\n")
    for r in results:
        f.write(r + "\n")

print(f"Update completed. Results in {OUTPUT_FILE}")
