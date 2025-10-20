import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
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
  ArrowRight,
  Sparkles,
  Github,
  Code,
  Heart
} from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

interface LandingPageProps {
  onGetStarted: () => void;
  onAbout?: () => void;
}

export function LandingPage({ onGetStarted, onAbout }: LandingPageProps) {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleVisibility = () => setIsVisible(true);
    
    window.addEventListener('scroll', handleScroll);
    setTimeout(handleVisibility, 100);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle overflow-hidden">
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-secondary/30 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-primary/15 rounded-full animate-bounce" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
      </div>

      {/* Header */}
      <header className={`container mx-auto px-4 py-6 transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <span className="text-lg font-bold text-primary-foreground group-hover:scale-110 transition-transform duration-300">₿</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent group-hover:tracking-wider transition-all duration-300">
              Pitipal
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {onAbout && (
              <Button onClick={onAbout} variant="ghost" className="hover:scale-105 transition-all duration-200 hover:bg-primary/10">
                About
              </Button>
            )}
            <Button onClick={onGetStarted} variant="hero" className="group hover:scale-105 hover:shadow-2xl transition-all duration-300">
              Get Started
              <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className={`space-y-8 transition-all duration-1000 delay-200 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'}`}>
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Smart Budgeting
                <span className="block bg-gradient-primary bg-clip-text text-transparent hover:scale-105 transition-transform duration-500 cursor-default">
                  Made Simple
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed hover:text-foreground transition-colors duration-300">
                Transform your financial life with unlimited budget pockets, AI-powered categorization, 
                seamless data import/export, and intelligent insights. Built for the modern user who 
                demands both simplicity and powerful features.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={onGetStarted} variant="hero" size="lg" className="group hover:scale-105 hover:shadow-2xl transition-all duration-300">
                Start Your Financial Journey
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-gradient-primary/10 border border-primary/20 hover:bg-gradient-primary/20 hover:scale-105 transition-all duration-300">
                <Brain className="h-3 w-3 text-primary animate-pulse" />
                <span className="text-primary font-medium">AI-Powered</span>
              </div>
              <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-gradient-secondary/10 border border-secondary/20 hover:bg-gradient-secondary/20 hover:scale-105 transition-all duration-300">
                <Zap className="h-3 w-3 text-secondary animate-bounce" />
                <span className="text-secondary font-medium">Smart Insights</span>
              </div>
            </div>
          </div>
          <div className={`relative transition-all duration-1000 delay-400 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}>
            <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-3xl opacity-20 animate-pulse"></div>
            <div 
              className="relative group cursor-pointer"
              style={{ transform: `translateY(${scrollY * -0.1}px)` }}
            >
              <img 
                src={heroImage} 
                alt="Pitipal Dashboard" 
                className="relative rounded-3xl shadow-2xl w-full group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-primary/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
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
          {[
            {
              icon: PiggyBank,
              title: "Unlimited Budget Pockets",
              description: "Create unlimited customizable budget categories with personalized colors, icons, and flexible budgeting cycles",
              delay: "0s"
            },
            {
              icon: Brain,
              title: "AI-Powered Intelligence", 
              description: "Smart categorization, transaction insights, and personalized recommendations that learn from your behavior",
              delay: "0.1s"
            },
            {
              icon: Upload,
              title: "Smart Import/Export",
              description: "Seamless CSV import with templates, data validation, and comprehensive export options for all your financial data", 
              delay: "0.2s"
            },
            {
              icon: CreditCard,
              title: "Multi-Account Management",
              description: "Manage savings, investment, and credit card accounts with automatic categorization and portfolio tracking",
              delay: "0.3s"
            },
            {
              icon: RefreshCw,
              title: "Robust Error Handling",
              description: "Advanced error recovery with automatic retries, comprehensive feedback, and seamless user experience",
              delay: "0.4s"
            },
            {
              icon: Smartphone,
              title: "Mobile-First Design",
              description: "Fully responsive interface optimized for mobile with intuitive gestures and lightning-fast performance",
              delay: "0.5s"
            }
          ].map((feature, index) => (
            <Card 
              key={feature.title}
              className={`bg-gradient-card border-0 shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-500 group cursor-pointer ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{ 
                transitionDelay: isVisible ? feature.delay : '0s',
                animationDelay: feature.delay 
              }}
            >
              <CardHeader className="group-hover:pb-2 transition-all duration-300">
                <div className={`w-12 h-12 ${index % 2 === 0 ? 'bg-gradient-primary' : 'bg-gradient-secondary'} rounded-xl flex items-center justify-center mb-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 group-hover:shadow-lg`}>
                  <feature.icon className={`h-6 w-6 ${index % 2 === 0 ? 'text-primary-foreground' : 'text-secondary-foreground'} group-hover:animate-pulse`} />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors duration-300">{feature.title}</CardTitle>
                <CardDescription className="group-hover:text-foreground transition-colors duration-300">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
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

      {/* Open Source Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-card border-0 shadow-xl overflow-hidden">
          <CardContent className="p-12">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                <Github className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <h3 className="text-3xl font-bold">Open Source & Free</h3>
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xl text-muted-foreground max-w-2xl">
                  Pitipal is completely open source and free to use. Built by the community, for the community.
                  Contribute, customize, and make it your own!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  variant="hero"
                  size="lg"
                  className="group"
                  onClick={() => window.open('https://github.com/Codekarsa/pitipal', '_blank')}
                >
                  <Github className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                  View on GitHub
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="group"
                  onClick={() => window.open('https://github.com/Codekarsa/pitipal/stargazers', '_blank')}
                >
                  <Sparkles className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                  Star the Project
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4">
                <Badge variant="outline" className="hover:scale-105 transition-transform duration-300">
                  MIT Licensed
                </Badge>
                <Badge variant="outline" className="hover:scale-105 transition-transform duration-300">
                  Community Driven
                </Badge>
                <Badge variant="outline" className="hover:scale-105 transition-transform duration-300">
                  Always Free
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
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
            © 2025 Pitipal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}