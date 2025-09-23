import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, TrendingUp, Zap, Shield, Smartphone, Brain } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
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
          <Button onClick={onGetStarted} variant="hero">
            Get Started
          </Button>
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
                Take control of your finances with unlimited customizable budget pockets, 
                AI-driven categorization, and intelligent insights that help you save more and spend smarter.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={onGetStarted} variant="hero" size="lg">
                Start Your Financial Journey
              </Button>
              <Button variant="outline" size="lg">
                View Demo
              </Button>
            </div>
            <div className="flex items-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-success" />
                <span>Bank-level Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-success" />
                <span>Instant Setup</span>
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
          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <PiggyBank className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Unlimited Budget Pockets</CardTitle>
              <CardDescription>
                Create unlimited customizable budget categories with personalized colors, icons, and goals
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle>AI-Powered Categorization</CardTitle>
              <CardDescription>
                Smart AI automatically categorizes your transactions and learns from your preferences
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Rich Analytics</CardTitle>
              <CardDescription>
                Interactive dashboards with spending insights, trends, and personalized recommendations
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle>Mobile-First Design</CardTitle>
              <CardDescription>
                Optimized for mobile with big buttons, fast input, and seamless touch experience
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Flexible Cycles</CardTitle>
              <CardDescription>
                Support for weekly, monthly, quarterly, yearly, and custom budgeting cycles
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                Bank-level encryption, secure Google Auth, and complete data privacy protection
              </CardDescription>
            </CardHeader>
          </Card>
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
              Join thousands of users who have taken control of their money with Pitipal. 
              Start your journey to financial freedom today.
            </p>
            <Button 
              onClick={onGetStarted} 
              variant="secondary" 
              size="lg"
              className="shadow-lg"
            >
              Get Started for Free
            </Button>
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