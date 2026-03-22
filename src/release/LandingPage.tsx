import React, { useState } from 'react';
import { Play, Check, Star } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

export default function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div style={{ background: '#06080F', color: '#F1F5F9', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: 0.18,
          top: -200,
          left: -150,
        }} />
        <div style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #F97316 0%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: 0.12,
          bottom: -200,
          right: 100,
        }} />
        <div style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: 0.07,
          top: '50%',
          left: '40%',
        }} />
        <div style={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: 0.1,
          top: '60%',
          right: -100,
        }} />
      </div>

      {/* Dot grid */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Page content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Navbar */}
        <nav style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '0 40px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(6,8,15,0.6)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          transition: 'background 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366F1, #F97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Star size={18} color="white" fill="white" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
              Debator
            </span>
          </div>
          <ul style={{ display: 'flex', alignItems: 'center', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
            <li><a href="#how-it-works" style={{ fontSize: 14, fontWeight: 500, color: '#64748B', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, transition: 'color 0.2s, background 0.2s' }}>How it works</a></li>
            <li><a href="#features" style={{ fontSize: 14, fontWeight: 500, color: '#64748B', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, transition: 'color 0.2s, background 0.2s' }}>Features</a></li>
            <li><a href="#models" style={{ fontSize: 14, fontWeight: 500, color: '#64748B', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, transition: 'color 0.2s, background 0.2s' }}>Models</a></li>
            <li><a href="#pricing" style={{ fontSize: 14, fontWeight: 500, color: '#64748B', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, transition: 'color 0.2s, background 0.2s' }}>Pricing</a></li>
          </ul>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onSignIn} style={{
              padding: '8px 18px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'Space Grotesk', sans-serif",
              color: '#64748B',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}>
              Sign in
            </button>
            <button onClick={onGetStarted} style={{
              padding: '8px 18px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif",
              color: 'white',
              background: '#6366F1',
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s, box-shadow 0.2s',
            }}>
              Get started free
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section style={{
          minHeight: '100vh',
          padding: '64px 40px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            paddingTop: 80,
            paddingBottom: 56,
          }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 100,
              border: '1px solid rgba(99,102,241,0.35)',
              background: 'rgba(99,102,241,0.08)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#818CF8',
              marginBottom: 28,
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#22D3EE',
                boxShadow: '0 0 8px #22D3EE',
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              Multi-Agent AI · Decision Intelligence
            </div>

            {/* Hero Heading */}
            <h1 style={{
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              marginBottom: 24,
              maxWidth: 820,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Assemble your AI council,<br />
              <span style={{
                background: 'linear-gradient(90deg, #F97316 0%, #6366F1 50%, #22D3EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                debating every angle.
              </span>
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: '#64748B',
              maxWidth: 560,
              marginBottom: 40,
            }}>
              Deploy multiple AI models as specialized agents. Watch them debate, challenge, and synthesize — delivering decisions backed by true multi-perspective reasoning.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 48, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={onGetStarted} style={{
                padding: '14px 28px',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'Space Grotesk', sans-serif",
                color: 'white',
                background: '#6366F1',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'box-shadow 0.2s, opacity 0.2s',
              }}>
                <Play size={16} fill="white" />
                Launch your first debate
              </button>
              <button style={{
                padding: '14px 28px',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'Space Grotesk', sans-serif",
                color: '#F1F5F9',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.14)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background 0.2s, border-color 0.2s',
              }}>
                <Play size={16} />
                Watch demo
              </button>
            </div>

            {/* Proof Points */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: '#64748B', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} color="#22D3EE" strokeWidth={2.5} />
                No credit card required
              </div>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#475569' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} color="#22D3EE" strokeWidth={2.5} />
                Free tier available
              </div>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#475569' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} color="#22D3EE" strokeWidth={2.5} />
                4 top AI models included
              </div>
            </div>
          </div>

          {/* Agent Constellation */}
          <div style={{ width: '100%', maxWidth: 820, padding: '0 0 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%', justifyContent: 'space-between', position: 'relative', minHeight: 240 }}>
              
              {/* Left Column: Claude + Gemini */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Claude Agent */}
                <div style={{
                  position: 'relative',
                  width: 188,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.035)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(217,118,89,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                  cursor: 'pointer',
                  zIndex: 2,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(217,118,89,0.14)', border: '1px solid rgba(217,118,89,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 100 100" fill="none"><path d="M57.2 14.5L82.5 80h-16L60 60H40L33.5 80h-16L43 14.5h14.2zM50 28l-7.5 22h15L50 28z" fill="#D97659"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>Analyst</div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginTop: 1 }}>Claude 3.5</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22D3EE', boxShadow: '0 0 6px #22D3EE', animation: 'blink 1.8s infinite' }} />
                    <span>Ready</span>
                  </div>
                </div>

                {/* Gemini Agent */}
                <div style={{
                  position: 'relative',
                  width: 188,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.035)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(66,133,244,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                  cursor: 'pointer',
                  zIndex: 2,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(66,133,244,0.14)', border: '1px solid rgba(66,133,244,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#4285F4"><path d="M12 2C12 2 11.5 7.5 9 10S2 12 2 12s5.5.5 7 3 1 7 1 7 .5-5.5 3-7 7-1 7-1-5.5-.5-7-3-1-9-1-9z"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>Strategist</div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginTop: 1 }}>Gemini 1.5</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22D3EE', boxShadow: '0 0 6px #22D3EE', animation: 'blink 1.8s infinite' }} />
                    <span>Ready</span>
                  </div>
                </div>
              </div>

              {/* Center Hub */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative' }}>
                <div style={{ width: 100, height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                  {/* Outer Ring */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(99,102,241,0.25)',
                    animation: 'hub-spin 8s linear infinite',
                  }} />
                  {/* Mid Ring */}
                  <div style={{
                    position: 'absolute',
                    inset: 12,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(249,115,22,0.3)',
                    animation: 'hub-spin-reverse 5s linear infinite',
                  }} />
                  {/* Core */}
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(249,115,22,0.25))',
                    border: '1px solid rgba(99,102,241,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 0 30px rgba(99,102,241,0.3), 0 0 60px rgba(249,115,22,0.12)',
                    zIndex: 1,
                  }}>
                    <div style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'rgba(241,245,249,0.7)',
                      textAlign: 'center',
                      lineHeight: 1.3,
                    }}>
                      Decision<br/>Hub
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: GPT-4 + Grok */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-end' }}>
                {/* GPT-4 Agent */}
                <div style={{
                  position: 'relative',
                  width: 188,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.035)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(16,163,127,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                  cursor: 'pointer',
                  zIndex: 2,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(16,163,127,0.14)', border: '1px solid rgba(16,163,127,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 41 41" fill="#10A37F"><path d="M37.5 16.7a10.4 10.4 0 00-.9-8.5 10.6 10.6 0 00-11.3-5.1A10.4 10.4 0 0017.6 0a10.5 10.5 0 00-10 7.3 10.5 10.5 0 00-7 5.1 10.6 10.6 0 001.3 12.4 10.4 10.4 0 00.9 8.5 10.6 10.6 0 0011.3 5.1 10.4 10.4 0 007.7 3.1 10.5 10.5 0 0010-7.3 10.5 10.5 0 007-5.1 10.6 10.6 0 00-1.3-12.4zM22.6 38.2a7.8 7.8 0 01-5-1.8l.2-.1 8.4-4.8a1.4 1.4 0 00.7-1.2V19l3.5 2a.1.1 0 010 .1v9.7a7.8 7.8 0 01-7.8 7.4zM6 31.5a7.7 7.7 0 01-.9-5.2l.2.1 8.3 4.8a1.4 1.4 0 001.4 0L25 25.6v4a.1.1 0 010 .1L16.4 34a7.8 7.8 0 01-10.4-2.5zm-1.7-17a7.7 7.7 0 014.1-3.4v9.8a1.4 1.4 0 00.7 1.2l9.9 5.7-3.5 2a.1.1 0 01-.1 0L6.8 23a7.8 7.8 0 01-2.5-8.5zm28.8 6.7l-9.9-5.7 3.5-2a.1.1 0 01.1 0l8.6 5a7.8 7.8 0 01-1.2 14l-.1-.1V21.5a1.4 1.4 0 00-.7-1.3h-.3zM34.7 18l-.2-.1-8.3-4.8a1.4 1.4 0 00-1.4 0L15 18.7v-4a.1.1 0 010-.1L23.6 10a7.8 7.8 0 0111.1 8.1v-.1zM13.5 22.7L10 20.7a.1.1 0 010-.1v-9.7a7.8 7.8 0 0112.8-6l-.2.1-8.3 4.8a1.4 1.4 0 00-.7 1.2l-.1 11.7zm1.9-4.1l4.4-2.6 4.5 2.6v5l-4.4 2.6-4.5-2.6V18.6z"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>Critic</div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginTop: 1 }}>GPT-4o</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22D3EE', boxShadow: '0 0 6px #22D3EE', animation: 'blink 1.8s infinite' }} />
                    <span>Ready</span>
                  </div>
                </div>

                {/* Grok Agent */}
                <div style={{
                  position: 'relative',
                  width: 188,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.035)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(155,138,255,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                  cursor: 'pointer',
                  zIndex: 2,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(155,138,255,0.14)', border: '1px solid rgba(155,138,255,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#9B8AFF"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>Facilitator</div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginTop: 1 }}>Grok Beta</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22D3EE', boxShadow: '0 0 6px #22D3EE', animation: 'blink 1.8s infinite' }} />
                    <span>Ready</span>
                  </div>
                </div>
              </div>

              {/* SVG Connection Lines */}
              <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} viewBox="0 0 820 240" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="line-claude" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D97659" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.5"/>
                  </linearGradient>
                  <linearGradient id="line-gemini" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4285F4" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.5"/>
                  </linearGradient>
                  <linearGradient id="line-gpt4" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#10A37F" stopOpacity="0.5"/>
                  </linearGradient>
                  <linearGradient id="line-grok" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#9B8AFF" stopOpacity="0.5"/>
                  </linearGradient>
                </defs>

                {/* Claude → Hub */}
                <path id="p-claude" d="M 192,62 C 340,62 380,120 410,120" fill="none" stroke="url(#line-claude)" strokeWidth="1.5"/>
                <circle r="4" fill="#D97659" opacity="0.9">
                  <animateMotion dur="2.2s" repeatCount="indefinite" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.6 1">
                    <mpath href="#p-claude"/>
                  </animateMotion>
                </circle>

                {/* Gemini → Hub */}
                <path id="p-gemini" d="M 192,178 C 340,178 380,120 410,120" fill="none" stroke="url(#line-gemini)" strokeWidth="1.5"/>
                <circle r="4" fill="#4285F4" opacity="0.9">
                  <animateMotion dur="2.6s" repeatCount="indefinite" begin="0.6s">
                    <mpath href="#p-gemini"/>
                  </animateMotion>
                </circle>

                {/* GPT-4 → Hub */}
                <path id="p-gpt4" d="M 628,62 C 480,62 440,120 410,120" fill="none" stroke="url(#line-gpt4)" strokeWidth="1.5"/>
                <circle r="4" fill="#10A37F" opacity="0.9">
                  <animateMotion dur="2.4s" repeatCount="indefinite" begin="0.3s">
                    <mpath href="#p-gpt4"/>
                  </animateMotion>
                </circle>

                {/* Grok → Hub */}
                <path id="p-grok" d="M 628,178 C 480,178 440,120 410,120" fill="none" stroke="url(#line-grok)" strokeWidth="1.5"/>
                <circle r="4" fill="#9B8AFF" opacity="0.9">
                  <animateMotion dur="2.8s" repeatCount="indefinite" begin="1s">
                    <mpath href="#p-grok"/>
                  </animateMotion>
                </circle>
              </svg>
            </div>
          </div>

          {/* Stats Strip */}
          <div style={{
            display: 'flex',
            gap: 32,
            alignItems: 'center',
            padding: '14px 28px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.035)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.07)',
            marginTop: 60,
            marginBottom: 80,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#F97316' }}>4</span>
              <span style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.04em' }}>AI Models</span>
            </div>
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#6366F1' }}>∞</span>
              <span style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.04em' }}>Debate Rounds</span>
            </div>
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#22D3EE' }}>1</span>
              <span style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.04em' }}>Consensus Output</span>
            </div>
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>Real-time</span>
              <span style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.04em' }}>Streaming</span>
            </div>
          </div>
        </section>

        {/* Logos Bar */}
        <div style={{ padding: '32px 40px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#475569' }}>
            Powered by the world's leading AI models
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { name: 'Claude', provider: 'Anthropic', color: '#D97659' },
              { name: 'Gemini', provider: 'Google', color: '#4285F4' },
              { name: 'GPT-4', provider: 'OpenAI', color: '#10A37F' },
              { name: 'Grok', provider: 'xAI', color: '#9B8AFF' },
            ].map((model) => (
              <div key={model.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(16px)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: model.color }} />
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700 }}>{model.name}</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>{model.provider}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Section */}
        <section id="how-it-works" style={{ padding: '80px 40px', maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#818CF8',
              marginBottom: 16,
            }}>
              How it works
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              marginBottom: 16,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Three steps to better decisions
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.6, maxWidth: 560 }}>
              Launch a multi-agent debate in minutes. No complex setup required.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {[
              { num: '1', icon: '💭', title: 'Frame your decision', desc: 'Describe your challenge or question. Our AI understands context and generates a structured debate framework.' },
              { num: '2', icon: '🤖', title: 'Agents debate', desc: 'Multiple AI models take different perspectives, challenge assumptions, and explore trade-offs in real-time.' },
              { num: '3', icon: '✨', title: 'Get consensus', desc: 'Receive a synthesized recommendation with supporting evidence, dissenting views, and confidence scores.' },
            ].map((step) => (
              <div key={step.num} style={{
                padding: 28,
                borderRadius: 20,
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                transition: 'border-color 0.25s, box-shadow 0.25s',
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#6366F1',
                }}>
                  {step.num}
                </div>
                <div style={{ fontSize: 28 }}>{step.icon}</div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', maxWidth: 1140, margin: '0 auto' }} />

        {/* Features Section */}
        <section id="features" style={{ padding: '80px 40px', maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#818CF8',
              marginBottom: 16,
            }}>
              Features
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Built for critical decisions
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {[
              { title: 'Multi-Model Debates', desc: 'Claude, GPT-4, Gemini, and Grok collaborate and compete to explore every angle of your decision.' },
              { title: 'Real-time Streaming', desc: 'Watch the debate unfold live. See arguments form, challenges emerge, and consensus build in real-time.' },
              { title: 'Structured Reasoning', desc: 'Agents follow debate protocols: opening statements, rebuttals, synthesis, and final recommendations.' },
              { title: 'Confidence Scoring', desc: 'Every recommendation includes confidence levels, dissenting opinions, and areas of uncertainty.' },
            ].map((feature) => (
              <div key={feature.title} style={{
                borderRadius: 20,
                padding: 28,
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(16px)',
                transition: 'border-color 0.25s',
              }}>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{feature.title}</h3>
                <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', maxWidth: 1140, margin: '0 auto' }} />

        {/* Pricing Section */}
        <section id="pricing" style={{ padding: '80px 40px', maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#818CF8',
              marginBottom: 16,
            }}>
              Pricing
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              marginBottom: 16,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Simple, transparent pricing
            </h2>

            {/* Pricing Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, justifyContent: 'center' }}>
              <span style={{ fontSize: 14, color: isAnnual ? '#64748B' : '#F1F5F9', cursor: 'pointer' }} onClick={() => setIsAnnual(false)}>
                Monthly
              </span>
              <div onClick={() => setIsAnnual(!isAnnual)} style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: 'rgba(99,102,241,0.3)',
                border: '1px solid rgba(99,102,241,0.4)',
                position: 'relative',
                cursor: 'pointer',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 3,
                  left: isAnnual ? 23 : 3,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#6366F1',
                  transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ fontSize: 14, color: isAnnual ? '#F1F5F9' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsAnnual(true)}>
                Annual
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Space Grotesk', sans-serif",
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#22D3EE',
                  background: 'rgba(34,211,238,0.1)',
                  border: '1px solid rgba(34,211,238,0.25)',
                  padding: '3px 8px',
                  borderRadius: 6,
                }}>
                  Save 20%
                </span>
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              {
                tier: 'Free',
                price: '$0',
                desc: 'Perfect for trying out multi-agent debates',
                features: [
                  { text: '5 debates per month', included: true },
                  { text: '2 AI models per debate', included: true },
                  { text: 'Basic debate templates', included: true },
                  { text: 'Community support', included: true },
                  { text: 'Advanced models', included: false },
                  { text: 'Priority support', included: false },
                ],
                cta: 'Get started',
                featured: false,
              },
              {
                tier: 'Pro',
                price: isAnnual ? '$23' : '$29',
                desc: 'For professionals making critical decisions',
                features: [
                  { text: 'Unlimited debates', included: true },
                  { text: '4+ AI models per debate', included: true },
                  { text: 'Custom debate templates', included: true },
                  { text: 'Priority support', included: true },
                  { text: 'Advanced analytics', included: true },
                  { text: 'API access', included: true },
                ],
                cta: 'Start free trial',
                featured: true,
              },
              {
                tier: 'Enterprise',
                price: 'Custom',
                desc: 'For teams and organizations',
                features: [
                  { text: 'Everything in Pro', included: true },
                  { text: 'Dedicated infrastructure', included: true },
                  { text: 'Custom model selection', included: true },
                  { text: 'SLA guarantee', included: true },
                  { text: 'Dedicated support', included: true },
                  { text: 'Custom integrations', included: true },
                ],
                cta: 'Contact sales',
                featured: false,
              },
            ].map((plan) => (
              <div key={plan.tier} style={{
                borderRadius: 20,
                padding: 28,
                background: 'rgba(255,255,255,0.035)',
                border: plan.featured ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: plan.featured ? '0 0 40px rgba(99,102,241,0.12)' : 'none',
              }}>
                {plan.featured && (
                  <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    padding: '4px 10px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Space Grotesk', sans-serif",
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: '#6366F1',
                    color: 'white',
                  }}>
                    Popular
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748B' }}>
                    {plan.tier}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em' }}>
                      {plan.price}
                    </span>
                    {plan.price !== 'Custom' && <span style={{ fontSize: 14, color: '#64748B' }}>/month</span>}
                  </div>
                  <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginTop: 8 }}>{plan.desc}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#64748B' }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 9,
                        background: feature.included ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.05)',
                        color: feature.included ? '#22D3EE' : '#475569',
                      }}>
                        {feature.included ? '✓' : '×'}
                      </div>
                      {feature.text}
                    </div>
                  ))}
                </div>
                <button onClick={onGetStarted} style={{
                  width: '100%',
                  padding: 13,
                  borderRadius: 12,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: plan.featured ? 'none' : '1px solid rgba(255,255,255,0.14)',
                  background: plan.featured ? '#6366F1' : 'transparent',
                  color: plan.featured ? 'white' : '#F1F5F9',
                  transition: 'opacity 0.2s, box-shadow 0.2s',
                }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section style={{ padding: '80px 40px 100px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{
            maxWidth: 700,
            width: '100%',
            padding: '64px 48px',
            borderRadius: 28,
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: -80,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)',
              pointerEvents: 'none',
            }} />
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              fontFamily: "'Space Grotesk', sans-serif",
              position: 'relative',
            }}>
              Ready to make better decisions?
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 440, lineHeight: 1.6, position: 'relative' }}>
              Join teams using multi-agent AI to tackle their toughest challenges. Start your first debate in minutes.
            </p>
            <button onClick={onGetStarted} style={{
              padding: '14px 28px',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif",
              color: 'white',
              background: '#6366F1',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'box-shadow 0.2s, opacity 0.2s',
              position: 'relative',
            }}>
              Get started free
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: 40,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 1140,
          margin: '0 auto',
          flexWrap: 'wrap',
          gap: 20,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: 'linear-gradient(135deg, #6366F1, #F97316)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Star size={14} color="white" fill="white" />
              </div>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700 }}>Debator</span>
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>Multi-Agent AI Decision Intelligence</div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color 0.2s' }}>Privacy</a>
            <a href="#" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color 0.2s' }}>Terms</a>
            <a href="#" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color 0.2s' }}>Docs</a>
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes hub-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hub-spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
