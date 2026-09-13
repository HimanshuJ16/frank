import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PushbackArena from "@/components/PushbackArena";
import ReceiptPrinter from "@/components/ReceiptPrinter";
import ThreeResponses from "@/components/ThreeResponses";
import BenchmarkSection from "@/components/BenchmarkSection";
import ModeSelector from "@/components/ModeSelector";
import AgentMatrix from "@/components/AgentMatrix";
import FlatteryLinter from "@/components/FlatteryLinter";
import CommandsTable from "@/components/CommandsTable";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07090e] text-[#f1f4fa]">
      <Navbar />
      <Hero />
      <PushbackArena />
      <ReceiptPrinter />
      <ThreeResponses />
      <BenchmarkSection />
      <ModeSelector />
      <AgentMatrix />
      <FlatteryLinter />
      <CommandsTable />
      <Footer />
    </main>
  );
}
