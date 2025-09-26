import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PiggyBank, 
  TrendingUp, 
  Zap, 
  Shield, 
  Smartphone, 
  Brain, 
  Download, 
  Upload, 
  RefreshCw, 
  CreditCard, 
  PieChart, 
  Settings,
  Users,
  ArrowRight
} from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

interface LandingPageProps {
  onGetStarted: () => void;
  onAbout?: () => void;
}

export function LandingPage({ onGetStarted, onAbout }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <span className="text-lg font-bold text-primary-foreground">₿</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Pitipal
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {onAbout && (
              <Button onClick={onAbout} variant="ghost">
                About
              </Button>
            )}
            <Button onClick={onGetStarted} variant="hero">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge className="bg-gradient-primary text-primary-foreground">
                AI-Powered Budgeting
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Smart Budgeting
                <span className="block bg-gradient-primary bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Transform your financial life with unlimited budget pockets, AI-powered categorization, 
                seamless data import/export, and intelligent insights. Built for the modern user who 
                demands both simplicity and powerful features.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={onGetStarted} variant="hero" size="lg" className="group">
                Start Your Financial Journey
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-smooth" />
              </Button>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-gradient-primary/10 border border-primary/20">
                <Brain className="h-3 w-3 text-primary animate-pulse" />
                <span className="text-primary font-medium">AI-Powered</span>
              </div>
              <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-gradient-secondary/10 border border-secondary/20">
                <Zap className="h-3 w-3 text-secondary" />
                <span className="text-secondary font-medium">Smart Insights</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-3xl opacity-20"></div>
            <img 
              src={heroImage} 
              alt="Pitipal Dashboard" 
              className="relative rounded-3xl shadow-2xl w-full"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold">
            Everything You Need to
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Master Your Money
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to make budgeting effortless, engaging, and effective
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth group">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth">
                <PiggyBank className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Unlimited Budget Pockets</CardTitle>
              <CardDescription>
                Create unlimited customizable budget categories with personalized colors, icons, and flexible budgeting cycles
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth group">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth">
                <Brain className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle>AI-Powered Intelligence</CardTitle>
              <CardDescription>
                Smart categorization, transaction insights, and personalized recommendations that learn from your behavior
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth group">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth">
                <Upload className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Smart Import/Export</CardTitle>
              <CardDescription>
                Seamless CSV import with templates, data validation, and comprehensive export options for all your financial data
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth group">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth">
                <CreditCard className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle>Multi-Account Management</CardTitle>
              <CardDescription>
                Manage savings, investment, and credit card accounts with automatic categorization and portfolio tracking
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth group">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth">
                <RefreshCw className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Robust Error Handling</CardTitle>
              <CardDescription>
                Advanced error recovery with automatic retries, comprehensive feedback, and seamless user experience
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth group">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth">
                <Smartphone className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle>Mobile-First Design</CardTitle>
              <CardDescription>
                Fully responsive interface optimized for mobile with intuitive gestures and lightning-fast performance
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Additional Features Section */}
        <div className="mt-20">
          <div className="text-center space-y-4 mb-12">
            <h3 className="text-2xl lg:text-3xl font-bold">
              Advanced Features for Power Users
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional-grade tools designed to handle complex financial scenarios
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <PieChart className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Rich Analytics Dashboard</h4>
                    <p className="text-muted-foreground">
                      Interactive charts, spending trends, category breakdowns, and predictive insights to optimize your financial decisions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Settings className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Advanced Settings</h4>
                    <p className="text-muted-foreground">
                      Customize categories, manage templates, configure automatic rules, and personalize your budgeting experience.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Bank-Level Security</h4>
                    <p className="text-muted-foreground">
                      End-to-end encryption, secure authentication, and complete data privacy with Google Auth integration.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Download className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Data Portability</h4>
                    <p className="text-muted-foreground">
                      Complete control over your data with comprehensive export options and easy migration tools.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-primary border-0 shadow-2xl text-center">
          <CardContent className="py-16 px-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">
              Ready to Transform Your Finances?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join thousands of users who have transformed their financial habits with Pitipal. 
              Start your journey to financial freedom with our comprehensive budgeting platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={onGetStarted} 
                variant="secondary" 
                size="lg"
                className="shadow-lg group"
              >
                Get Started for Free
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-smooth" />
              </Button>
              {onAbout && (
                <Button 
                  onClick={onAbout} 
                  variant="outline" 
                  size="lg"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Learn More
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-border">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">₿</span>
            </div>
            <span className="font-semibold text-foreground">Pitipal</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Pitipal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}