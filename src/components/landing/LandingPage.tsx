import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PiggyBank, 
  Shield, 
  Smartphone, 
  Brain, 
  Upload, 
  CreditCard, 
  ArrowRight,
  Sparkles,
  Github,
  Code
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onAbout?: () => void;
}

export function LandingPage({ onGetStarted, onAbout }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]">
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}></div>
      </div>

      {/* Header */}
      <header className="relative container mx-auto px-4 py-6 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">Pitipal</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.open('https://github.com/Codekarsa/pitipal', '_blank')}
              className="hidden sm:flex"
            >
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </Button>
            {onAbout && (
              <Button onClick={onAbout} variant="ghost" size="sm">
                About
              </Button>
            )}
            <Button onClick={onGetStarted} size="sm">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-sm">
            <Code className="h-3 w-3" />
            <span>Open Source • AGPL-3.0 Licensed</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
            Smart budgeting
            <span className="block text-primary">made simple</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A modern, open-source budget management tool with unlimited pockets, 
            AI-powered insights, and seamless data portability.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button onClick={onGetStarted} size="lg" className="text-base">
              Start for Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => window.open('https://github.com/Codekarsa/pitipal', '_blank')}
              className="text-base"
            >
              <Github className="mr-2 h-4 w-4" />
              View on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative container mx-auto px-4 py-20 border-t border-border/40">
        <div className="text-center space-y-4 mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl lg:text-5xl font-bold">
            Everything you need
          </h2>
          <p className="text-lg text-muted-foreground">
            A complete budgeting solution with powerful features designed for simplicity
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            {
              icon: PiggyBank,
              title: "Unlimited Budget Pockets",
              description: "Create unlimited customizable budget categories with flexible cycles"
            },
            {
              icon: Brain,
              title: "AI-Powered Insights", 
              description: "Smart categorization and personalized recommendations"
            },
            {
              icon: Upload,
              title: "Import/Export",
              description: "Seamless CSV import with templates and comprehensive exports"
            },
            {
              icon: CreditCard,
              title: "Multi-Account",
              description: "Manage savings, investments, and credit cards in one place"
            },
            {
              icon: Shield,
              title: "Secure & Private",
              description: "Bank-level security with complete data privacy"
            },
            {
              icon: Smartphone,
              title: "Mobile-First",
              description: "Fully responsive design optimized for all devices"
            }
          ].map((feature, index) => (
            <Card 
              key={feature.title}
              className="border-border/40 bg-card hover:border-primary/50 transition-colors"
            >
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Open Source Section */}
      <section className="relative container mx-auto px-4 py-20 border-t border-border/40">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex w-16 h-16 bg-primary/10 rounded-2xl items-center justify-center mb-4">
            <Github className="h-8 w-8 text-primary" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-5xl font-bold">
              Open Source & Community Driven
            </h2>
            <p className="text-lg text-muted-foreground">
              Pitipal is completely free and open source under the AGPL-3.0 license.
              Join our community, contribute to the project, or customize it for your needs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              variant="default"
              size="lg"
              onClick={() => window.open('https://github.com/Codekarsa/pitipal', '_blank')}
            >
              <Github className="mr-2 h-5 w-5" />
              View on GitHub
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.open('https://github.com/Codekarsa/pitipal/stargazers', '_blank')}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Star the Project
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-6">
            <Badge variant="outline" className="text-sm px-3 py-1">
              AGPL-3.0 Licensed
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              Community Driven
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              Always Free
            </Badge>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative container mx-auto px-4 py-20 border-t border-border/40">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl lg:text-5xl font-bold">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground">
            Start managing your budget smarter today. No credit card required.
          </p>
          <Button onClick={onGetStarted} size="lg">
            Get Started for Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/40 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <PiggyBank className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Pitipal</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Pitipal. Open source under AGPL-3.0 License.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}