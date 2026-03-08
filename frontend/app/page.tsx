'use client';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import './styles.css';
import { motion } from 'framer-motion';
import { ShieldAlert, Zap, Terminal, WifiOff, LineChart, Blocks, DollarSign, Activity, Clock, ShieldCheck, Lock, Twitter, Github, MessageSquare, BarChart3, Menu, ClipboardList, RefreshCcw, RefreshCw, Map, Gauge, Instagram, Youtube } from 'lucide-react';


const fadeUp = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

export default function RestovaHomepage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Force scroll to top on refresh
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="r3">

      <div className="r3-z">
        {/* NAV */}
        <nav className={`r3-nav ${scrolled ? 'scrolled' : ''}`}>
          <div className="r3-nav-inner">
            <a href="#" className="r3-logo">
              <div className="r3-logo-mark">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="var(--color-text-inverse)" /></svg>
              </div>
              Restova
            </a>
            <ul className="r3-nav-links">
              <li><a href="#">Product</a></li>
              <li><a href="#">Features</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
            <div className="r3-nav-right">
              {loading ? null : user ? (
                <>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginRight: 12 }}>{user.user_metadata?.full_name || user.user_metadata?.name || user.email}</span>
                  <Link href="/dashboard" className="r3-btn-primary">Dashboard</Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="r3-btn-ghost">Log in</Link>
                  <Link href="/signup" className="r3-btn-primary">Create Restaurant</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* HERO */}
        <motion.section className="r3-hero !pt-40 !pb-20 !px-8" initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp}>
            <div className="r3-eyebrow !mb-12">
              <span className="r3-eyebrow-dot" />
              Edge-native architecture
            </div>
            <h1 className="r3-hero h1">
              Everything your Restaurant Needs,
              <br />in <em>One System.</em>
            </h1>
            <p className="r3-hero-sub">
              Orders, menus, analytics, and team workflows — unified in a beautifully designed operating system built for modern restaurants.
            </p>
            <div className="r3-hero-actions">
              {loading ? null : user ? (
                <Link href="/dashboard" className="r3-btn-hero-p">
                  Open Dashboard
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              ) : (
                <Link href="/signup" className="r3-btn-hero-p">
                  Create Your Restaurant
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              )}
              <a href="#" className="r3-btn-hero-s">
                View Live Demo
              </a>
            </div>
          </motion.div>

          {/* MOCKUP */}
          <div className="r3-mockup-wrap">
            <motion.div
              className="r3-mockup"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <div className="r3-mock-bar">
                <div className="r3-mock-dot r3-mock-dot-r" />
                <div className="r3-mock-dot r3-mock-dot-y" />
                <div className="r3-mock-dot r3-mock-dot-g" />
                <div className="r3-mock-url">api.restova.io/v1/metrics</div>
              </div>
              <div className="r3-mock-body">
                <div className="r3-mock-sidebar">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`r3-mock-si${i === 1 ? ' active' : ''}`} />
                  ))}
                </div>
                <div className="r3-mock-content">
                  <div className="r3-mock-cards">
                    {[
                      { val: '$12.4k', lbl: 'Revenue', icon: <DollarSign size={14} className="r3-mock-icon" /> },
                      { val: '2.1k', lbl: 'Active Sessions', icon: <Activity size={14} className="r3-mock-icon" /> },
                      { val: '12ms', lbl: 'Latency', icon: <Clock size={14} className="r3-mock-icon" /> },
                    ].map((c) => (
                      <div key={c.lbl} className="r3-mock-card">
                        <div className="r3-mock-card-val">
                          {c.icon}
                          {c.val}
                        </div>
                        <div className="r3-mock-card-lbl">{c.lbl}</div>
                        <div className="r3-mock-card-bar" />
                      </div>
                    ))}
                  </div>
                  <div className="r3-mock-chart-area">
                    {[30, 50, 40, 70, 45, 90, 60, 80, 50, 65, 85, 40, 75, 55, 95].map((h, i) => (
                      <div key={i} className={`r3-c-bar${h > 80 ? ' hi' : h > 60 ? ' md' : ''}`} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* FLOATS */}
            <motion.div className="r3-float r3-float-l"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="r3-float-lbl">Edge Nodes</div>
              <div className="r3-float-val">124 Global</div>
              <div className="r3-float-tag">Operational</div>
            </motion.div>
            <motion.div className="r3-float r3-float-r"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="r3-float-lbl">P99 Latency</div>
              <div className="r3-float-val">8.42ms</div>
              <div className="r3-float-tag">Excellent</div>
            </motion.div>
          </div>
        </motion.section>

        {/* STATS */}
        <section className="r3-stats">
          <motion.div className="r3-stats-inner" initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            {[
              { icon: <Zap size={20} />, val: 'Realtime', lbl: 'Order Flow' },
              { icon: <BarChart3 size={20} />, val: 'Smart', lbl: 'Analytics' },
              { icon: <ClipboardList size={20} />, val: 'Flexible', lbl: 'Menus' },
              { icon: <ShieldCheck size={20} />, val: 'Secure', lbl: 'by default' },
              { icon: <RefreshCw size={20} />, val: 'CRDT', lbl: 'Sync' },
            ].map((s) => (
              <motion.div key={s.lbl} className="r3-stat-item" variants={fadeUp}>
                <div className="r3-stat-icon">{s.icon}</div>
                <div className="r3-stat-val">{s.val}</div>
                <div className="r3-stat-lbl">{s.lbl}</div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* FEATURES */}
        <section className="r3-features">
          <div className="r3-features-inner">
            <div className="r3-section-header">
              <div className="r3-section-header-left">
                <span className="r3-section-tag">System Architecture</span>
                <h2 className="r3-section-h2">Built for real restaurant operations</h2>
              </div>
              <p className="r3-section-p">
                Built for the pace of real restaurant service.
                Orders move instantly from customer to cashier to kitchen — without delays.
              </p>
            </div>
            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              {/* Card 1: LARGE REVENUE (2x2) */}
              <motion.div className="r3-feat-card r3-feat-rev lg:col-span-2 lg:row-span-2 md:col-span-2" variants={fadeUp}>
                <div className="r3-rev-top">
                  <div className="r3-rev-title-group">
                    <div className="r3-section-tag" style={{ marginBottom: 12 }}>Restaurant revenue today</div>
                    <div className="r3-feat-title" style={{ fontSize: 24, marginBottom: 0 }}>Efficiently scale your restaurant.</div>
                  </div>
                  <div className="r3-rev-live">
                    <div className="r3-rev-live-dot" />
                    LIVE UPDATES
                  </div>
                </div>

                <div className="r3-rev-main-val">$4,910.42</div>
                <div className="r3-stat-lbl" style={{ marginBottom: 32 }}>Total Revenue Today</div>

                <div className="r3-rev-grid-content">
                  <div className="r3-rev-feed">
                    {[
                      { icon: <DollarSign size={14} />, name: 'Signature Burger', time: '2m ago', amt: '+$24.00' },
                      { icon: <Zap size={14} />, name: 'Express Checkout', time: '5m ago', amt: '+$142.50' },
                      { icon: <Clock size={14} />, name: 'Priority Order', time: '12m ago', amt: '+$89.20' },
                    ].map((item, idx) => (
                      <div key={idx} className="r3-rev-item">
                        <div className="r3-rev-item-info">
                          <div className="r3-rev-item-icon">{item.icon}</div>
                          <div>
                            <div className="r3-rev-item-name">{item.name}</div>
                            <div className="r3-rev-item-time">{item.time}</div>
                          </div>
                        </div>
                        <div className="r3-rev-item-amt">{item.amt}</div>
                      </div>
                    ))}
                  </div>
                  <div className="r3-rev-heatmap">
                    {[...Array(35)].map((_, i) => (
                      <div
                        key={i}
                        className={`r3-rev-h-block ${i % 7 === 0 ? 'peak' : i % 3 === 0 ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Card 2: UPTIME */}
              <motion.div className="r3-feat-card r3-feat-uptime lg:col-span-1 md:col-span-1" variants={fadeUp}>
                <div className="r3-feat-icon small"><Activity size={18} /></div>
                <div className="r3-feat-title" style={{ fontSize: 16, marginBottom: 4 }}>Live Order Feed</div>
                <div className="r3-feat-desc" style={{ fontSize: 13 }}>Every order appears instantly on the cashier and kitchen screens,
                  keeping your entire team perfectly in sync.</div>
              </motion.div>

              {/* Card 3: SECURITY */}
              <motion.div className="r3-feat-card r3-feat-security lg:col-span-1 md:col-span-1" variants={fadeUp}>
                <div className="r3-feat-icon small"><ShieldAlert size={18} /></div>
                <div className="r3-feat-title" style={{ fontSize: 16, marginBottom: 4 }}>Operational Security</div>
                <div className="r3-feat-desc" style={{ fontSize: 13 }}>Role-based permissions ensure every staff member
                  only sees what they need.</div>
              </motion.div>

              {/* Card 4: ORDERS (Highlighted) */}
              <motion.div className="r3-feat-card r3-feat-orders lg:col-span-1 md:col-span-1" variants={fadeUp}>
                <div className="r3-feat-tag" style={{ fontSize: 18, marginBottom: 4 }}>Orders processed</div>
                <div className="r3-stat-val">In real time</div>
                <div className="r3-stat-lbl" style={{ fontSize: 16 }}>Even during peak service</div>
              </motion.div>

              {/* Card 5: ANALYTICS */}
              <motion.div className="r3-feat-card r3-feat-analytics lg:col-span-1 md:col-span-1" variants={fadeUp}>
                <div className="r3-feat-icon small"><LineChart size={18} /></div>
                <div className="r3-feat-title" style={{ fontSize: 16, marginBottom: 4 }}>Sales Intelligence</div>
                <div className="r3-feat-desc" style={{ fontSize: 13 }}>Understand your revenue, peak hours, and best-selling items
                  with real-time analytics designed for restaurant operations.</div>
              </motion.div>

              {/* Card 6: MULTI-LOCATION */}
              <motion.div className="r3-feat-card r3-feat-multi lg:col-span-1 md:col-span-1" variants={fadeUp}>
                <div className="r3-feat-icon small"><Map size={18} /></div>
                <div className="r3-feat-title" style={{ fontSize: 16, marginBottom: 4 }}>Multi-location</div>
                <div className="r3-feat-desc" style={{ fontSize: 13 }}>Manage multiple restaurants, menus, and teams
                  from a single unified dashboard.</div>
              </motion.div>

              {/* Card 7: LATENCY (Small) */}
              <motion.div className="r3-feat-card r3-feat-latency lg:col-span-1 md:col-span-1" variants={fadeUp}>
                <div className="r3-feat-info">
                  <div className="r3-feat-icon small"><Gauge size={18} /></div>
                  <div className="r3-feat-title" style={{ fontSize: 16, marginBottom: 4 }}>Lightning Performance</div>
                  <div className="r3-feat-desc" style={{ fontSize: 13 }}>Orders travel from customer phone to kitchen screen
                    in milliseconds.</div>
                </div>
              </motion.div>

              {/* Card 8: OFFLINE (Wide) */}
              <motion.div className="r3-feat-card r3-feat-offline lg:col-span-2 md:col-span-1" variants={fadeUp}>
                <div className="r3-feat-icon small"><WifiOff size={18} /></div>
                <div className="r3-feat-title" style={{ fontSize: 18, marginBottom: 4 }}>Offline Resilience</div>
                <div className="r3-feat-desc" style={{ fontSize: 14 }}>Orders continue to sync even when the internet connection drops,
                  so service never stops during peak hours.</div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* PRICING */}
        <section className="r3-pricing">
          <div className="r3-pricing-inner">
            <div className="r3-pricing-header">
              <h2 className="r3-section-h2">Plans built for <em>restaurants</em></h2>
              <p className="r3-pricing-sub" style={{ marginTop: '16px', color: 'var(--color-text-muted)', fontSize: '18px' }}>Start free, grow with your business, and scale when you&apos;re ready.</p>
            </div>
            <div className="r3-pricing-grid">
              {[
                {
                  tier: 'Starter',
                  priceNode: <><div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px' }}>3 months free</div><div style={{ fontSize: '16px', color: 'var(--color-text-muted)', marginTop: '4px', letterSpacing: '0' }}>then $99 / month</div></>,
                  desc: 'Perfect for small restaurants starting with QR ordering and digital menus.',
                  features: ['QR digital menu', 'Basic order dashboard', 'Up to 750 orders per month', '1 restaurant location'],
                  featured: false,
                  buttonText: 'Start Free'
                },
                {
                  tier: 'Professional',
                  priceNode: <><div style={{ fontSize: '48px', fontWeight: 900 }}>$199<span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0' }}>&nbsp;/ month</span></div><div style={{ fontSize: '16px', color: 'var(--color-brand-primary)', marginTop: '4px', fontWeight: 600, letterSpacing: '0' }}>First month free</div></>,
                  desc: 'Built for busy restaurants that need a powerful and reliable order system.',
                  features: ['Unlimited orders', 'Realtime cashier dashboard', 'Advanced order management', 'Advanced analytics & reports', 'Priority support'],
                  featured: true,
                  buttonText: 'Start Free Trial'
                },
                {
                  tier: 'Multi-Location',
                  priceNode: <><div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px' }}>Custom pricing</div></>,
                  desc: 'For restaurant groups, franchises, and multi-location businesses.',
                  features: ['Multiple restaurants', 'Centralized management dashboard', 'Dedicated onboarding', 'Custom integrations'],
                  featured: false,
                  buttonText: 'Contact Sales'
                },
              ].map((p) => (
                <div key={p.tier} className={`r3-p-card${p.featured ? ' featured' : ''}`}>
                  {p.featured && <div className="r3-p-badge">Most Popular</div>}
                  <div className="r3-p-tier">{p.tier}</div>
                  <div className="r3-p-price" style={{ lineHeight: '1.2' }}>{p.priceNode}</div>
                  <p className="r3-p-desc">{p.desc}</p>
                  <ul className="r3-p-feats">
                    {p.features.map((f) => (
                      <li key={f}><span className="r3-p-check">✓</span> {f}</li>
                    ))}
                  </ul>
                  <button className={p.featured ? 'r3-p-btn r3-p-btn-primary' : 'r3-p-btn r3-p-btn-ghost'}>
                    {p.buttonText}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '48px', color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
              No credit card required<br />
              Cancel anytime
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="r3-cta">
          <div className="r3-cta-inner">
            <motion.div className="r3-cta-box" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <h2 className="r3-cta-h2">The complete <em>digital</em> platform for modern <em>restaurants</em></h2>
              <p className="r3-cta-p">Launch your digital menu, receive orders in real time, and grow your restaurant with powerful analytics.</p>
              <div className="r3-cta-acts">
                <button className="r3-cta-white">Start Free</button>
                <button className="r3-cta-ghost">Watch Demo</button>
              </div>
              <p className="r3-cta-trust">Free to start — no credit card required</p>
            </motion.div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="r3-footer">
          <div className="r3-footer-inner">
            <motion.div
              className="r3-footer-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div className="r3-footer-brand" variants={fadeUp}>
                <a href="#" className="r3-footer-logo">
                  <div className="r3-logo-mark" style={{ width: 32, height: 32 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="var(--color-text-inverse)" /></svg>
                  </div>
                  Restova
                </a>
                <p className="r3-footer-desc">
                  The high-performance core for the next generation of food service technology.
                  Built for the global edge.
                </p>
                <div className="r3-footer-socials">
                  <a href="#" className="r3-footer-social-link"><Instagram size={18} /></a>
                  <a href="#" className="r3-footer-social-link"><Github size={18} /></a>
                  <a href="#" className="r3-footer-social-link"><Youtube size={18} /></a>
                  <a href="#" className="r3-footer-social-link"><MessageSquare size={18} /></a>
                </div>
              </motion.div>

              {[
                { title: 'Platform', links: ['Product', 'Security', 'Features', 'Demo'] },
                { title: 'Developers', links: ['Documentation', 'API Reference', 'CRDT', 'Changelog'] },
                { title: 'Information', links: ['Pricing', 'Privacy Policy', 'SLA', 'Contact'] },
              ].map((col) => (
                <motion.div key={col.title} className="r3-footer-col" variants={fadeUp}>
                  <h5>{col.title}</h5>
                  <ul>
                    {col.links.map((l) => <li key={l}><a href="#">{l}</a></li>)}
                  </ul>
                </motion.div>
              ))}
            </motion.div>

            <div className="r3-footer-bottom">
              <span className="r3-footer-copy">© 2026 Restova Systems Inc. All rights reserved.</span>
              <div className="r3-status-pill">
                <div className="r3-status-dot" />
                SYSTEM OPERATIONAL: 124 NODES ONLINE
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
