import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PiggyBank, 
  Shield, 
  Smartphone, 
  BarChart3,
  Upload, 
  CreditCard, 
  ArrowRight,
  Sparkles,
  Github,
  Code
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onAbout?: () => void;
}

export function LandingPage({ onGetStarted, onSignIn, onAbout }: LandingPageProps) {
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/pitipal_square.png" alt="Pitipal" className="w-full h-full object-cover" />
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
            <Button onClick={onSignIn} variant="outline" size="sm">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-10 sm:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-5 text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Know what's left
            <span className="block text-primary">before you spend</span>
          </h1>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            Give groceries, rent, and other priorities their own budget pockets.
            Set an amount for each pocket, record your spending, and see how much remains.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
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
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground lg:justify-start"><Code className="h-3 w-3" />Open-source software · AGPL-3.0</p>
          </div>
          <Card className="w-full max-w-lg mx-auto text-left border-primary/30 shadow-none">
            <CardHeader>
              <Badge variant="outline" className="w-fit">Example preview · not your account</Badge>
              <CardTitle>Groceries pocket</CardTitle>
              <CardDescription>Illustrative monthly budget in IDR. No bank connection or live data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="space-y-3">
                <div className="flex justify-between gap-4"><dt>Budget</dt><dd>IDR 3,000,000</dd></div>
                <div className="flex justify-between gap-4"><dt>Spending recorded</dt><dd>− IDR 250,000</dd></div>
                <div className="flex justify-between gap-4 border-t pt-3 font-semibold"><dt>Left to spend</dt><dd>IDR 2,750,000</dd></div>
              </dl>
              <p className="text-sm text-muted-foreground">3M budget − 250k spending = 2.75M left. Your totals depend on the transactions you record.</p>
            </CardContent>
          </Card>
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
              icon: BarChart3,
              title: "Spending Overview",
              description: "See recorded income, expenses, and remaining pocket budgets"
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
              title: "Know How Data Is Used",
              description: "Read the privacy information below for details about Supabase and optional analytics"
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
              Pitipal's source code is available under the AGPL-3.0 license.
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
              Source Available
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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                <img src="/pitipal_square.png" alt="Pitipal" className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold">Pitipal</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Pitipal. Open source under AGPL-3.0 License.
            </p>
            <nav aria-label="Data and usage information" className="flex gap-4 text-sm">
              <a className="underline" href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy information (new tab)</a>
              <a className="underline" href="/usage.html" target="_blank" rel="noopener noreferrer">Usage information (new tab)</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
