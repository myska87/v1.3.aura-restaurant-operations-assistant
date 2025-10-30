import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Sparkles, Award, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

const CORE_VALUES = [
  {
    icon: '🌿',
    title: 'Warmth',
    description: 'Every interaction radiates genuine care and hospitality',
    color: 'from-green-400 to-emerald-500'
  },
  {
    icon: '💪',
    title: 'Discipline',
    description: 'Excellence through consistency and attention to detail',
    color: 'from-blue-400 to-cyan-500'
  },
  {
    icon: '🧭',
    title: 'Heritage',
    description: 'Honoring authentic traditions while innovating boldly',
    color: 'from-amber-400 to-orange-500'
  },
  {
    icon: '🚀',
    title: 'Growth',
    description: 'Continuous learning and development for every team member',
    color: 'from-purple-400 to-pink-500'
  },
  {
    icon: '💚',
    title: 'Respect',
    description: 'Valuing every person, every role, every contribution',
    color: 'from-teal-400 to-green-500'
  }
];

export default function TrainingWelcome() {
  const [videoPlayed, setVideoPlayed] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-8">
              <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Welcome to the<br/>
              <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 text-transparent bg-clip-text">
                Chai Patta Family
              </span>
            </h1>
            
            <motion.p
              className="text-2xl md:text-3xl text-purple-200 mb-4 font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              We don't create customers —
            </motion.p>
            
            <motion.p
              className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300 mb-12"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
            >
              We create Craving Fans ✨
            </motion.p>

            <Link to={createPageUrl('TrainingAcademy')}>
              <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-lg px-8 py-6 rounded-full shadow-2xl">
                <Award className="w-6 h-6 mr-2" />
                Start Your Journey
                <ArrowRight className="w-6 h-6 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Brand Story Video */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Our Story, Your Purpose
            </h2>
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Chai Patta Brand Story"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onPlay={() => setVideoPlayed(true)}
              />
            </div>
            <p className="text-center text-purple-200 text-sm">
              Watch this to understand the heart and soul of Chai Patta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Core Values Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Our Core Values</h2>
          <p className="text-xl text-purple-200">
            These five values guide everything we do
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {CORE_VALUES.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 1 }}
            >
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/20 transition-all h-full">
                <CardContent className="p-6 text-center">
                  <div className="text-6xl mb-4">{value.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                  <p className="text-sm text-purple-200 leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Heart className="w-16 h-16 text-white mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
            <p className="text-xl text-white/90 leading-relaxed italic mb-8">
              "To serve every cup with a story, inspire every team member with purpose, 
              and build a culture of excellence."
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-white">
              <div className="flex flex-col items-center">
                <Sparkles className="w-8 h-8 mb-2" />
                <p className="font-semibold">Exceptional Quality</p>
              </div>
              <div className="flex flex-col items-center">
                <Heart className="w-8 h-8 mb-2" />
                <p className="font-semibold">Authentic Care</p>
              </div>
              <div className="flex flex-col items-center">
                <TrendingUp className="w-8 h-8 mb-2" />
                <p className="font-semibold">Continuous Growth</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call to Action */}
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5 }}
        >
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Begin?
          </h2>
          <p className="text-xl text-purple-200 mb-8">
            Start your training journey and become part of something extraordinary
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link to={createPageUrl('TrainingAcademy')}>
              <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-6 text-lg rounded-full shadow-xl">
                <GraduationCap className="w-6 h-6 mr-2" />
                Enter Training Academy
              </Button>
            </Link>
            <Link to={createPageUrl('CultureBuilding')}>
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg rounded-full">
                <Heart className="w-6 h-6 mr-2" />
                Explore Our Culture
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Footer Quote */}
      <div className="max-w-4xl mx-auto px-6 py-12 text-center border-t border-white/10">
        <p className="text-lg text-purple-300 italic">
          "Raise your standard — not your excuses."
        </p>
        <p className="text-sm text-purple-400 mt-2">
          - Tony Robbins
        </p>
      </div>
    </div>
  );
}