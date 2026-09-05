import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { BackToTop } from "./components/BackToTop";
import { HomePage } from "./pages/HomePage";
import { AnalysisArchive } from "./pages/AnalysisArchive";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { Contact } from "./pages/Contact";
import { About } from "./pages/About";
import { References } from "./pages/References";
import { FAQ } from "./pages/FAQ";
import { Glossary } from "./pages/Glossary";
import { OperatorInfo } from "./pages/OperatorInfo";
import { CrimeStatistics } from "./pages/CrimeStatistics";
import { EconomicImpact } from "./pages/EconomicImpact";
import { SocialSecurity } from "./pages/SocialSecurity";
import { NaturalizationParadox } from "./pages/NaturalizationParadox";
import { BurialControversy } from "./pages/BurialControversy";
import { LandAcquisition } from "./pages/LandAcquisition";
import { UKImmigrationLesson } from "./pages/UKImmigrationLesson";
import { NationalSecurity } from "./pages/NationalSecurity";
import { NigeriaCase } from "./pages/NigeriaCase";
import { MathematicalSimulation } from "./pages/MathematicalSimulation";
import { LaborDilemma } from "./pages/LaborDilemma";
import { VideoGuide } from "./pages/VideoGuide";
import { StatisticalEvidence } from "./pages/StatisticalEvidence";
import { RiskAnalysis } from "./pages/RiskAnalysis";
import { LaborMismatch } from "./pages/LaborMismatch";
import { SummaryStatistics } from "./pages/SummaryStatistics";
import { PolicyRecommendations } from "./pages/PolicyRecommendations";
import { Conclusion } from "./pages/Conclusion";
import { StrategicRecommendations } from "./pages/StrategicRecommendations";
import { BorderlessWelfarePage } from "./pages/BorderlessWelfarePage";
import { SymbiosisPage } from "./pages/SymbiosisPage";
import { AISimulation } from "./pages/AISimulation";
import { ImagePage } from "./pages/ImagePage";
import { Disclaimer } from "./pages/Disclaimer";
import { CrimeNewsArchive } from "./pages/CrimeNewsArchive";

const App: React.FC = () => {
  // ハイドレーションエラーを防ぐためのフラグ
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0d1117]">
      {/* 
        サーバー側でプリレンダリングされる内容を固定する。
        クライアントでも初回レンダリング時はこれと同じ構造を出す。
      */}
      <Navigation />
      
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/analysis-archive/" element={<AnalysisArchive />} />
        <Route path="/analysis/crime-statistics/" element={<CrimeStatistics />} />
        <Route path="/analysis/economic-impact/" element={<EconomicImpact />} />
        <Route path="/analysis/social-security/" element={<SocialSecurity />} />
        <Route path="/analysis/naturalization-paradox/" element={<NaturalizationParadox />} />
        <Route path="/analysis/burial-controversy/" element={<BurialControversy />} />
        <Route path="/analysis/land-acquisition/" element={<LandAcquisition />} />
        <Route path="/analysis/uk-immigration-lesson/" element={<UKImmigrationLesson />} />
        <Route path="/analysis/national-security/" element={<NationalSecurity />} />
        <Route path="/analysis/nigeria-case/" element={<NigeriaCase />} />
        <Route path="/analysis/simulation-model/" element={<MathematicalSimulation />} />
        <Route path="/analysis/labor-dilemma/" element={<LaborDilemma />} />
        <Route path="/analysis/video-guide/" element={<VideoGuide />} />
        <Route path="/analysis/statistical-evidence/" element={<StatisticalEvidence />} />
        <Route path="/analysis/risk-analysis/" element={<RiskAnalysis />} />
        <Route path="/analysis/labor-mismatch/" element={<LaborMismatch />} />
        <Route path="/analysis/summary-statistics/" element={<SummaryStatistics />} />
        <Route path="/analysis/policy-recommendations/" element={<PolicyRecommendations />} />
        <Route path="/analysis/conclusion/" element={<Conclusion />} />
        <Route path="/analysis/strategic-recommendations/" element={<StrategicRecommendations />} />
        <Route path="/analysis/image/:id" element={<ImagePage />} />
        <Route path="/analysis/borderless-welfare-state/" element={<BorderlessWelfarePage />} />
        <Route path="/analysis/symbiosis/" element={<SymbiosisPage />} />
        <Route path="/analysis/ai-simulation/" element={<AISimulation />} />
        <Route path="/privacy-policy/" element={<PrivacyPolicy />} />
        <Route path="/disclaimer/" element={<Disclaimer />} />
        <Route path="/contact/" element={<Contact />} />
        <Route path="/about/" element={<About />} />
        <Route path="/references/" element={<References />} />
        <Route path="/faq/" element={<FAQ />} />
        <Route path="/glossary/" element={<Glossary />} />
        <Route path="/operator-info/" element={<OperatorInfo />} />
        <Route path="/analysis/crime-news/" element={<CrimeNewsArchive />} />
      </Routes>
      
      {/* クライアント側でのみ表示される動的コンポーネント */}
      {isClient && <BackToTop />}
    </div>
  );
};

export default App;
