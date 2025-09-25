import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Target,
  Users,
  Lightbulb,
  Heart,
  Shield,
  Zap,
  Globe,
  Code,
  Smartphone,
  Brain
} from "lucide-react";

interface AboutPageProps {
  onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
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
          <Button onClick={onBack} variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge className="bg-gradient-primary text-primary-foreground">
            About Pitipal
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
            Empowering Your
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Financial Journey
            </span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Pitipal was born from the belief that everyone deserves access to powerful, 
            intuitive financial tools. We're building the future of personal budgeting 
            with AI-driven insights and user-centric design.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground leading-relaxed">
                To democratize financial wellness by providing powerful, accessible budgeting tools 
                that adapt to every user's unique financial situation and goals. We believe managing 
                money shouldn't be complicated or stressful.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="h-8 w-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-2xl">Our Vision</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground leading-relaxed">
                A world where financial literacy and smart money management are accessible to everyone, 
                powered by intelligent technology that learns from your habits and helps you achieve 
                your financial dreams.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Core Values */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold">
            What We
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Stand For
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our core values guide every decision we make and every feature we build
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>User-Centric</CardTitle>
              <CardDescription>
                Every feature is designed with our users' needs at the center. We listen, adapt, and evolve based on real feedback.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle>Privacy First</CardTitle>
              <CardDescription>
                Your financial data is yours alone. We employ bank-level security and never share your information.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <Heart className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Empathy Driven</CardTitle>
              <CardDescription>
                We understand that money management can be emotional and personal. Our tools are built with compassion.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold">
            Built With
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Modern Technology
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Leveraging cutting-edge technologies to deliver a fast, secure, and reliable experience
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth text-center p-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-3">
              <Code className="h-5 w-5 text-primary-foreground" />
            </div>
            <h4 className="font-semibold text-sm">React & TypeScript</h4>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth text-center p-6">
            <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center mx-auto mb-3">
              <Zap className="h-5 w-5 text-secondary-foreground" />
            </div>
            <h4 className="font-semibold text-sm">Supabase Backend</h4>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth text-center p-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-3">
              <Smartphone className="h-5 w-5 text-primary-foreground" />
            </div>
            <h4 className="font-semibold text-sm">Mobile-First PWA</h4>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth text-center p-6">
            <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center mx-auto mb-3">
              <Brain className="h-5 w-5 text-secondary-foreground" />
            </div>
            <h4 className="font-semibold text-sm">AI Integration</h4>
          </Card>
        </div>
      </section>

      {/* Team Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold">
            Meet The
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Team
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A passionate group of developers, designers, and financial experts working to revolutionize personal finance
          </p>
        </div>

        <Card className="bg-gradient-primary border-0 shadow-2xl text-center max-w-4xl mx-auto">
          <CardContent className="py-16 px-8">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-primary-foreground mb-4">
              Built with Love by the Pitipal Team
            </h3>
            <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              We're a distributed team of passionate individuals who believe in the power of technology 
              to make financial wellness accessible to everyone, everywhere.
            </p>
            <Badge className="bg-white/20 text-white border-white/30">
              Remote-First • Global Impact
            </Badge>
          </CardContent>
        </Card>
      </section>

      {/* Contact Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-card border-0 shadow-lg max-w-2xl mx-auto text-center">
          <CardContent className="py-12 px-8">
            <h2 className="text-2xl font-bold mb-4">Get In Touch</h2>
            <p className="text-muted-foreground mb-8">
              Have questions, feedback, or want to learn more? We'd love to hear from you.
            </p>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                📧 hello@pitipal.com
              </p>
              <p className="text-sm text-muted-foreground">
                🐦 @pitipal
              </p>
              <p className="text-sm text-muted-foreground">
                💬 Join our community for updates and tips
              </p>
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
            © 2024 Pitipal. Empowering financial wellness for everyone.
          </p>
        </div>
      </footer>
    </div>
  );
}