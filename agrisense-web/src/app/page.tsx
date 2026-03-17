import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, ShieldCheck, Zap, Globe, Leaf, History, UserCheck, Sprout } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="#">
          <Sprout className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-primary">AgriSense AI</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#how-it-works">
            How it Works
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link href="/scan">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-green-50 to-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <Badge className="px-3 py-1 mb-4" variant="secondary">
                  Trusted by 1M+ Farmers
                </Badge>
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none text-slate-900">
                  Detect Crop Diseases in <span className="text-primary text-green-700">10 Seconds</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400 mt-4">
                  AI-powered agricultural expert in your pocket. Identify diseases, get organic treatments, and save your harvest.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row pt-4">
                <Link href="/scan">
                  <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
                    <Camera className="mr-2 h-5 w-5" /> Start Free Scan
                  </Button>
                </Link>
                <Link href="#features">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full">
                    Learn More
                  </Button>
                </Link>
              </div>
              <div className="pt-8 flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  98% Accuracy
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4 text-primary" />
                  12+ Languages
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-12 border-y bg-white" id="features">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="p-3 bg-green-100 rounded-2xl mb-2">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Instant Detection</CardTitle>
                  <CardDescription>Upload a photo and get results in seconds using Gemini 2.0 AI.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="p-3 bg-green-100 rounded-2xl mb-2">
                    <Leaf className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Organic Treatments</CardTitle>
                  <CardDescription>Detailed organic and chemical recovery plans for 500+ diseases.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="p-3 bg-green-100 rounded-2xl mb-2">
                    <UserCheck className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Expert Voice</CardTitle>
                  <CardDescription>Listen to treatment plans in your local language with ElevenLabs voice.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="w-full py-20 lg:py-32 bg-slate-50" id="how-it-works">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How It Works</h2>
              <p className="mt-4 text-gray-500 md:text-lg">Simple steps to protect your crops</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              <div className="flex flex-col items-center text-center z-10">
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mb-4 shadow-md">1</div>
                <h3 className="text-xl font-bold mb-2">Capture</h3>
                <p className="text-gray-500">Take a clear photo of the affected plant leaf.</p>
              </div>
              <div className="flex flex-col items-center text-center z-10">
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mb-4 shadow-md">2</div>
                <h3 className="text-xl font-bold mb-2">Analyze</h3>
                <p className="text-gray-500">Our AI identifies the disease and its severity.</p>
              </div>
              <div className="flex flex-col items-center text-center z-10">
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mb-4 shadow-md">3</div>
                <h3 className="text-xl font-bold mb-2">Treat</h3>
                <p className="text-gray-500">Get a step-by-step recovery and treatment plan.</p>
              </div>
              <div className="flex flex-col items-center text-center z-10">
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mb-4 shadow-md">4</div>
                <h3 className="text-xl font-bold mb-2">Listen</h3>
                <p className="text-gray-500">Hear the advice in Hindi, Tamil, Telugu, or 10+ languages.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 bg-primary">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center text-white">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Ready to protect your harvest?</h2>
              <p className="mx-auto max-w-[600px] text-green-50 md:text-xl">
                Join thousands of farmers who are using AgriSense AI to increase their crop yield.
              </p>
              <Link href="/scan">
                <Button size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-full">
                  Start Your First Scan
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-6 border-t bg-white">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            <span className="font-bold">AgriSense AI</span>
          </div>
          <p className="text-sm text-gray-500">© 2026 AgriSense AI. All rights reserved.</p>
          <nav className="flex gap-4 sm:gap-6">
            <Link className="text-sm hover:underline underline-offset-4 text-gray-500" href="#">Terms</Link>
            <Link className="text-sm hover:underline underline-offset-4 text-gray-500" href="#">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
