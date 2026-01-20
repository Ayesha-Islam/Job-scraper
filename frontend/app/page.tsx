'use client'

import React, { useState } from 'react';
import { ArrowRight, Briefcase, MapPin, DollarSign, Clock, Sparkles } from 'lucide-react';

const JobScraperLanding = () => {
  const [email, setEmail] = useState('');

  const socialPlatforms = [
    { name: 'LinkedIn', label: 'Linked in' },
    { name: 'Instagram', label: 'Instagram' },
    { name: 'WWR', label: 'WWR' },
    { name: 'Indeed', label: 'indeed' },
    { name: 'Remotive', label: 'Remotive' }
  ];

  const stats = [
    { value: '50K+', label: 'Active Jobs' },
    { value: '100+', label: 'Companies' },
    { value: '10K+', label: 'Users Daily' }
  ];

  const jobs = [
    {
      title: 'Senior Frontend Developer',
      company: 'TechCorp',
      location: 'Remote - Worldwide',
      salary: '120K - 180K',
      type: 'Full-time',
      badge: 'LinkedIn',
      gradient: 'from-slate-800 to-slate-900'
    },
    {
      title: 'Product Designer',
      company: 'DesignHub',
      location: 'Remote - USA',
      salary: '90K - 140K',
      type: 'Full-time',
      badge: 'WWR',
      gradient: 'from-orange-700 to-orange-800'
    },
    {
      title: 'Backend Engineer',
      company: 'CloudScale',
      location: 'Remote - Europe',
      salary: '100K - 160K',
      type: 'Full-time',
      badge: 'Remote',
      gradient: 'from-purple-700 to-purple-800'
    }
  ];

  const awards = [
    { name: 'awwwards.', subtitle: 'HONORABLE MENTION' },
    { name: 'DESIGN KING', subtitle: 'TOP' },
    { name: 'DN', subtitle: '' },
    { name: 'Udemy', subtitle: '' },
    { name: 'CSS WINNER', subtitle: 'SITES OF THE DAY' }
  ];

  return (
    <div className='min-h-screen flex flex-col'>
      {/* Hero Section */}
      <section className="pt-32 pb-8 px-6 bg-cover bg-center bg-no-repeat relative text-white"
        style={{
          backgroundImage: `url('/bg.png')`,
          backgroundColor: '#050505'
        }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column: Content */}
            <div>
              <h1 className="text-3 md:text-4xl font-bold mb-6 leading-tight">
                Aim Higher, Reach <br />
                Farther, Dream Bigger<br />
              </h1>
              <p className="text-white text-lg mb-8">
                More than 100+ companies posting every day.
              </p>
              <button className="btn text-[15px] leading-tight uppercase px-8 py-4 rounded-full font-bold flex items-center gap-2 bg-gradient-to-br from-[#6167f8] to-[#4e54d4] text-white transition-all duration-200 hover:brightness-110">
                Start the Journey <ArrowRight className="w-5 h-5" />
              </button>

              <div className="flex gap-8 mt-12 mb-8">
                {stats.map((stat, idx) => (
                  <div key={idx}>
                    <div className="text-3xl font-bold">{stat.value}</div>
                    <div className="text-sm text-white">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Awards Section - Above Job Cards */}
        <section className='border-t border-white/10 py-10'>
          <div className="container mx-auto px-4">
            <div className="flex flex-row items-center justify-between gap-4">
              {socialPlatforms.map((platform, idx) => (
                <div key={idx} className="relative group cursor-pointer flex-1 max-w-[200px]">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-purple-400"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-purple-400"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-purple-400"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-400"></div>

                  <div className="py-4 px-2 text-center">
                    <div className="text-lg md:text-xl font-bold whitespace-nowrap transition-transform group-hover:scale-105">
                      {platform.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      {/* Ready to Explore Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl text-black font-bold italic mb-2">Ready to Explore</h2>
              <p className="text-black flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Remote opportunities worldwide
              </p>
            </div>
            <a href="#" className="text-black hover:text-black flex items-center gap-2">
              view all jobs <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {jobs.map((job, idx) => (
              <div key={idx} className="bg-black backdrop-blur rounded-2xl overflow-hidden border border-slate-800 hover:border-purple-500 transition-all group">
                <div className={`bg-gradient-to-br ${job.gradient} p-8 relative`}>
                  <div className="absolute top-4 right-4 bg-slate-900/50 backdrop-blur px-3 py-1 rounded-lg text-xs">
                    {job.badge}
                  </div>
                  <div className="w-20 h-20 bg-slate-900/30 backdrop-blur rounded-2xl flex items-center justify-center border-2 border-cyan-400 mx-auto">
                    <Briefcase className="w-10 h-10 text-cyan-400" />
                  </div>
                  <div className="absolute bottom-4 right-4 w-12 h-12 bg-cyan-400/20 rounded-lg transform rotate-12"></div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl text-white font-bold mb-4">{job.title}</h3>
                  <div className="space-y-2 text-sm text-gray-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-400" />
                      <span>{job.company}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-purple-400" />
                      <span>{job.salary}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-sm text-white">
                      <Clock className="w-4 h-4" />
                      {job.type}
                    </div>
                    <button className="text-white hover:text-purple-300 cursor-pointer flex items-center gap-1 text-sm font-medium">
                      View Job <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe Section */}
      <section className="py-20 px-6 bg-black">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8">
            <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          </div>
          <h2 className="text-5xl text-white font-bold mb-4">
            Subscribe to get more{' '}
            <span className="text-white">
              Opportunities
            </span>
          </h2>
          <p className="text-gray-400 mb-8">
            Get premium jobs and exclusive offers delivered<br />
            straight to your inbox
          </p>

          <div className="flex items-center gap-4 max-w-xl mx-auto bg-white rounded-full p-2">
            <div className="border-b border-b-black bg-white p-3 rounded-full">
              <Briefcase className="w-6 h-6" />
            </div>
            <input
              type="email"
              placeholder="Type your email here"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent text-black px-4 outline-none"
            />
            <button className="bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-900 transition">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JobScraperLanding;