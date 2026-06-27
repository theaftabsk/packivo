"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// SVGs and Icons
const ArrowRightIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const DemoIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LockIcon = () => (
  <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const CheckIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3 h-3">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3 h-3">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4.5 h-4.5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (custom: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: custom * 0.1,
      },
    }),
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const features = [
    {
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      colorClass: "fi-indigo",
      title: "Raw Material Management",
      desc: "Track Duplex sheets, Kraft rolls, and consumables with GSM, size, and lot tracking. Never run out of stock unexpectedly.",
    },
    {
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
      ),
      colorClass: "fi-cyan",
      title: "Production Job Scheduling",
      desc: "Plan 3-ply, 5-ply, 7-ply production runs. Track progress in real time, assign operators, and monitor efficiency metrics.",
    },
    {
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      colorClass: "fi-emerald",
      title: "Finished Goods Inventory",
      desc: "Maintain customer-wise product stock. Set low-stock alerts, adjust inventory, and view movement history with full audit trail.",
    },
    {
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h6a1 1 0 001-1v-4M13 16h-4" />
        </svg>
      ),
      colorClass: "fi-amber",
      title: "Dispatch & Challan Management",
      desc: "Generate delivery challans and invoices instantly. Track dispatches by vehicle, route, and customer with full logistics history.",
    },
    {
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      ),
      colorClass: "fi-rose",
      title: "Reports & Analytics",
      desc: "Daily production summaries, vendor-wise purchase reports, wastage analysis, and monthly P&L breakdowns — all exportable to Excel.",
    },
    {
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      colorClass: "fi-violet",
      title: "Role-Based Access & Audit Trail",
      desc: "Assign roles — Admin, Manager, Operator. Every action is logged with timestamps and user details for complete accountability.",
    },
  ];

  const steps = [
    { num: 1, title: "Sign Up & Configure", desc: "Create your tenant account, add your factory name, set up formula settings for ply calculations and pricing." },
    { num: 2, title: "Add Master Data", desc: "Import or enter your vendors, customers, printers, and product specifications using our guided forms or Excel import." },
    { num: 3, title: "Record Operations", desc: "Log raw material purchases, duplex print jobs, kraft ply production, and dispatch entries as they happen daily." },
    { num: 4, title: "Track & Export", desc: "View live dashboards, generate reports, export to Excel, and share insights with your management team instantly." },
  ];

  const testimonials = [
    {
      text: `"Before Packivo, we were managing everything in Excel files. Now we know exactly how many sheets are in stock, which jobs are in production, and what's ready to dispatch — all in one screen."`,
      avatar: "RK",
      name: "Rakesh Kumar",
      role: "Owner, Shri Packaging, Pune",
      color: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    },
    {
      text: `"The ply calculation feature alone saved us hours every week. We used to manually calculate kraft requirements for each job. Now it's automated and accurate every time."`,
      avatar: "PS",
      name: "Priya Shah",
      role: "Production Manager, Apex Cartons, Surat",
      color: "linear-gradient(135deg, #06b6d4, #0284c7)",
    },
    {
      text: `"The audit trail gives us complete peace of mind. Every entry, every edit is tracked. When the accountant asks about a specific purchase, I just pull up the log. Brilliant system."`,
      avatar: "AM",
      name: "Arjun Mehta",
      role: "Director, Mehta Box Industries, Mumbai",
      color: "linear-gradient(135deg, #10b981, #059669)",
    },
  ];

  const faqs = [
    { q: "Is there a free trial available?", a: "Yes! Every plan comes with a 14-day free trial with full access to all features. No credit card is required to start. You can upgrade or cancel at any time." },
    { q: "Can I import my existing Excel data?", a: "Absolutely. Packivo supports bulk Excel import for vendors, customers, products, and historical purchases. We also provide import templates to help you format your data correctly." },
    { q: "How many users can I add?", a: "The Starter plan supports up to 5 users, Professional supports up to 20, and Enterprise has unlimited users. You can assign different roles — Admin, Manager, and Operator — with custom permissions." },
    { q: "Is my data secure and backed up?", a: "Yes. All data is encrypted at rest and in transit. We perform daily automated backups and maintain a 30-day recovery window. Our infrastructure runs on 99.9% uptime SLA." },
    { q: "Do you support GST invoicing?", a: "Yes, Packivo is GST-compliant. You can record purchase invoices with GST details, generate delivery challans with tax breakdowns, and export GST-ready reports for your CA." },
    { q: "Can I use Packivo on mobile?", a: "Packivo is fully responsive and works on mobile browsers. You can check stock, record entries, and view reports from your phone or tablet without installing any app." },
  ];

  return (
    <>
      {/* NAVBAR */}
      <nav id="navbar" className={scrolled ? "scrolled" : ""}>
        <div className="nav-inner">
          <a href="#" className="logo">
            <div className="logo-mark">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="logo-name">
              Pack<span>ivo</span>
            </span>
          </a>
          <ul className={`nav-links ${mobileMenuOpen ? "mobile-open" : ""}`}>
            <li><a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a></li>
            <li><a href="#how" onClick={() => setMobileMenuOpen(false)}>How It Works</a></li>
            <li><a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a></li>
            <li><a href="#testimonials" onClick={() => setMobileMenuOpen(false)}>Reviews</a></li>
            <li><a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a></li>
          </ul>
          <div className="nav-cta">
            <a href="/login" className="btn-ghost">Sign In</a>
            <a href="/register" className="btn-primary">
              <ArrowRightIcon />
              Start Free Trial
            </a>
          </div>
          <div
            className="hamburger"
            id="hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span style={{ transform: mobileMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "" }}></span>
            <span style={{ opacity: mobileMenuOpen ? 0 : 1 }}></span>
            <span style={{ transform: mobileMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "" }}></span>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="hero-badge"
          >
            <span className="dot"></span>
            ✦ Now with AI-powered production forecasting
          </motion.div>
          
          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="hero-title"
          >
            The Smartest ERP for<br />
            <span className="highlight">Packaging Manufacturers</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="hero-sub"
          >
            From raw material inward to finished box dispatch — Packivo gives your factory complete visibility, real-time stock tracking, and effortless order management.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="hero-actions"
          >
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              href="/register"
              className="btn-hero-primary"
            >
              <ArrowRightIcon />
              Start Free — 14 Days Trial
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              href="#features"
              className="btn-hero-secondary"
            >
              <DemoIcon />
              Watch Demo
            </motion.a>
          </motion.div>

          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="hero-trust"
          >
            <span>✓ No credit card required</span>
            <span className="sep"></span>
            <span>✓ Free onboarding support</span>
            <span className="sep"></span>
            <span>✓ Cancel anytime</span>
            <span className="sep"></span>
            <span>✓ Indian pricing in ₹</span>
          </motion.div>

          {/* Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.5 }}
            className="hero-mockup"
          >
            <div className="mockup-wrap">
              <div className="mockup-shadow"></div>
              <div className="mockup-frame">
                {/* Browser bar */}
                <div className="mockup-bar">
                  <div className="mockup-dot d-red"></div>
                  <div className="mockup-dot d-yellow"></div>
                  <div className="mockup-dot d-green"></div>
                  <div className="mockup-url">
                    <LockIcon />
                    app.packivo.com/dashboard
                  </div>
                </div>
                {/* Body */}
                <div className="mockup-body">
                  {/* Sidebar */}
                  <div className="mockup-sidebar">
                    <div className="sidebar-logo-mock">PACKIVO</div>
                    <div className="sidebar-item active">
                      <span className="si-dot"></span> Dashboard
                    </div>
                    <div className="sidebar-item"><span className="si-dot"></span> Master Data</div>
                    <div className="sidebar-item"><span className="si-dot"></span> Duplex Sheets</div>
                    <div className="sidebar-item"><span className="si-dot"></span> Kraft Rolls</div>
                    <div className="sidebar-item"><span className="si-dot"></span> Production</div>
                    <div className="sidebar-item"><span className="si-dot"></span> Sales / Dispatch</div>
                    <div className="sidebar-item"><span className="si-dot"></span> Reports</div>
                    <div className="sidebar-item"><span className="si-dot"></span> Settings</div>
                  </div>
                  {/* Content */}
                  <div className="mockup-content">
                    <div className="mockup-header-row">
                      <div className="mockup-page-title">Factory Dashboard Overview</div>
                      <div className="mockup-badge">● Live Data</div>
                    </div>
                    <div className="stat-grid">
                      <div className="stat-card">
                        <div className="stat-label">Raw Duplex</div>
                        <div className="stat-value">12,450</div>
                        <div className="stat-sub">↑ Sheets</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Kraft Stock</div>
                        <div className="stat-value">38 Rolls</div>
                        <div className="stat-sub">↑ Available</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Finished Goods</div>
                        <div className="stat-value">4,200</div>
                        <div className="stat-sub">↑ Boxes ready</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Dispatched</div>
                        <div className="stat-value">₹2.4L</div>
                        <div className="stat-sub">↑ This Month</div>
                      </div>
                    </div>
                    <div className="chart-area">
                      <div className="chart-title-mock">Monthly Production vs Dispatch</div>
                      <div className="chart-bars">
                        {[
                          { val: "Jan", hA: 70, hB: 55 },
                          { val: "Feb", hA: 90, hB: 75 },
                          { val: "Mar", hA: 60, hB: 50 },
                          { val: "Apr", hA: 110, hB: 95 },
                          { val: "May", hA: 100, hB: 88 },
                          { val: "Jun", hA: 130, hB: 115 },
                        ].map((item, idx) => (
                          <div key={idx} className="bar-group">
                            <div className="bar-pair">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: item.hA }}
                                transition={{ duration: 1, delay: 0.6 + idx * 0.05 }}
                                className="bar bar-a"
                                style={{ width: 8 }}
                              ></motion.div>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: item.hB }}
                                transition={{ duration: 1, delay: 0.7 + idx * 0.05 }}
                                className="bar bar-b"
                                style={{ width: 8 }}
                              ></motion.div>
                            </div>
                            <div className="bar-label">{item.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="table-mock">
                      <div className="table-header-mock">
                        <div className="th-cell">Customer</div>
                        <div className="th-cell">Product</div>
                        <div className="th-cell">Qty</div>
                        <div className="th-cell">Status</div>
                      </div>
                      <div className="table-row-mock">
                        <div className="td-cell">Reliance Pack Ltd</div>
                        <div className="td-cell">5-Ply 40×30cm</div>
                        <div className="td-cell">2,400</div>
                        <div className="td-cell"><span className="td-badge td-green">Dispatched</span></div>
                      </div>
                      <div className="table-row-mock">
                        <div className="td-cell">Godrej Consumer</div>
                        <div className="td-cell">3-Ply 24×18cm</div>
                        <div className="td-cell">5,000</div>
                        <div className="td-cell"><span className="td-badge td-yellow">In Production</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* LOGOS STRIP */}
      <div className="logos-strip">
        <div className="logos-inner">
          <span className="logos-label">Trusted by packaging factories across India</span>
          <div className="logo-items">
            {["RELIANCE PACK", "GODREJ CONSUMER", "ITC PACKAGING", "UFLEX LIMITED", "BALMER LAWRIE"].map((logo, index) => (
              <motion.span
                key={index}
                whileHover={{ scale: 1.1, color: "var(--brand)" }}
                className="logo-item"
              >
                {logo}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="section features-section" id="features">
        <div className="container">
          <div className="text-center">
            <span className="section-badge">Core Features</span>
            <h2 className="section-title">
              Everything your factory needs,<br />all in one platform
            </h2>
            <p className="section-sub">
              Packivo covers the full manufacturing cycle — from raw material procurement to final dispatch — with real-time insights at every step.
            </p>
          </div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="features-grid"
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -6 }}
                className="feature-card"
              >
                <div className={`feature-icon ${feature.colorClass}`}>
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="stats-band">
        <div className="stats-grid">
          {[
            { num: "500+", label: "Factories Onboarded" },
            { num: "₹40Cr+", label: "Production Value Tracked" },
            { num: "99.9%", label: "Uptime SLA" },
            { num: "4.9★", label: "Average Rating" },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80, delay: idx * 0.1 }}
              className="stat-item"
            >
              <div className="stat-num">{stat.num}</div>
              <div className="stat-name">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section how-section" id="how">
        <div className="container">
          <div className="text-center">
            <span className="section-badge">How It Works</span>
            <h2 className="section-title">Get your factory live in 4 steps</h2>
            <p className="section-sub">Onboarding is fast and guided. Most factories are up and running within the same day.</p>
          </div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="steps-grid"
          >
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="step-card"
              >
                <div className="step-num">{step.num}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section pricing-section" id="pricing">
        <div className="container">
          <div className="text-center">
            <span className="section-badge">Pricing</span>
            <h2 className="section-title">Simple, transparent pricing</h2>
            <p className="section-sub">No hidden charges. Cancel any time. All plans include a 14-day free trial with full features.</p>
          </div>
          <div className="pricing-toggle">
            <span>Monthly</span>
            <div
              className={`toggle-switch ${isAnnual ? "" : "right"}`}
              id="billingToggle"
              onClick={() => setIsAnnual(!isAnnual)}
            ></div>
            <span>
              Annual <span className="save-badge">Save 20%</span>
            </span>
          </div>
          <div className="pricing-grid">
            {/* Starter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="pricing-card"
            >
              <div className="plan-name">Starter</div>
              <div className="plan-price">
                <sup>₹</sup>
                <span className="price-val">
                  {isAnnual ? (239).toLocaleString("en-IN") : (299).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="plan-period">per month + GST</div>
              <p className="plan-desc">Perfect for small packaging plants getting started with digital operations.</p>
              <div className="plan-divider"></div>
              <ul className="plan-features">
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  Up to 5 User Accounts
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  All Core ERP Modules
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  Excel Import & Export
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  Email Support
                </li>
                <li className="plan-feature" style={{ opacity: 0.45 }}>
                  <span className="pf-x"><XIcon /></span>
                  Advanced Analytics
                </li>
                <li className="plan-feature" style={{ opacity: 0.45 }}>
                  <span className="pf-x"><XIcon /></span>
                  API Access
                </li>
              </ul>
              <a href="/register" className="btn-plan btn-plan-outline">
                Get Started Free
              </a>
            </motion.div>

            {/* Professional */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -4 }}
              className="pricing-card popular"
            >
              <div className="popular-badge">Most Popular</div>
              <div className="plan-name">Professional</div>
              <div className="plan-price">
                <sup>₹</sup>
                <span className="price-val">
                  {isAnnual ? (4799).toLocaleString("en-IN") : (5999).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="plan-period">per month + GST</div>
              <p className="plan-desc">For mid-size active factories needing the full module suite and priority support.</p>
              <div className="plan-divider"></div>
              <ul className="plan-features">
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  Up to 20 User Accounts
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  All Modules + Reports
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  Advanced Analytics Dashboard
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  Priority Phone + Email Support
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  Audit Trail & Role Management
                </li>
                <li className="plan-feature" style={{ opacity: 0.45 }}>
                  <span className="pf-x"><XIcon /></span>
                  Custom API Access
                </li>
              </ul>
              <a href="/register" className="btn-plan btn-plan-fill">
                Start Free Trial
              </a>
            </motion.div>

            {/* Enterprise */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -4 }}
              className="pricing-card"
            >
              <div className="plan-name">Enterprise</div>
              <div className="plan-price">
                <sup>₹</sup>
                <span className="price-val">
                  {isAnnual ? (9599).toLocaleString("en-IN") : (11999).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="plan-period">per month + GST</div>
              <p className="plan-desc">Complete unlimited solution for large operations with custom integrations and dedicated support.</p>
              <div className="plan-divider"></div>
              <ul className="plan-features">
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  Unlimited User Accounts
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  All Features Included
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  Custom API Integration
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  Dedicated Account Manager
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  On-premise Deployment Option
                </li>
                <li className="plan-feature">
                  <span className="pf-check"><CheckIcon /></span>
                  24/7 Priority Support
                </li>
              </ul>
              <a href="mailto:sales@packivo.com" className="btn-plan btn-plan-outline">
                Contact Sales
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section testimonials-section" id="testimonials">
        <div className="container">
          <div className="text-center">
            <span className="section-badge">Customer Reviews</span>
            <h2 className="section-title">Loved by factory owners<br />across India</h2>
          </div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="testimonials-grid"
          >
            {testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -5 }}
                className="testimonial-card"
              >
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="star">★</span>
                  ))}
                </div>
                <p className="testimonial-text">{t.text}</p>
                <div className="testimonial-author">
                  <div className="author-avatar" style={{ background: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="author-name">{t.name}</div>
                    <div className="author-role">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section faq-section" id="faq">
        <div className="container">
          <div className="text-center">
            <span className="section-badge">FAQ</span>
            <h2 className="section-title">Frequently asked questions</h2>
          </div>
          <div className="faq-grid">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`faq-item ${isOpen ? "open" : ""}`}>
                  <div className="faq-question" onClick={() => toggleFaq(idx)}>
                    {faq.q}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      className="faq-icon"
                    >
                      <ChevronDownIcon />
                    </motion.div>
                  </div>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="faq-answer"
                      >
                        <p>{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div style={{ position: "relative", zIndex: 1 }}>
          <span className="section-badge">Get Started Today</span>
          <h2 className="cta-title">
            Ready to modernize your<br />packaging factory?
          </h2>
          <p className="cta-sub">
            Join 500+ factories already using Packivo to manage their operations. Start your free trial today — no card needed.
          </p>
          <div className="cta-actions">
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              href="/register"
              className="btn-hero-primary"
            >
              <ArrowRightIcon />
              Start Free Trial — 14 Days
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              href="mailto:sales@packivo.com"
              className="btn-hero-secondary"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Talk to Sales Team
            </motion.a>
          </div>
          <p className="cta-note">
            ✓ 14-day free trial &nbsp;·&nbsp; ✓ No credit card &nbsp;·&nbsp; ✓ Cancel anytime &nbsp;·&nbsp; ✓ Free onboarding
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo-name">
                Pack<span>ivo</span> ERP
              </div>
              <p>The all-in-one cloud ERP built specifically for packaging manufacturers across India. Simplify your factory operations from day one.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#how">How It Works</a>
              <a href="/login">Sign In</a>
              <a href="/register">Free Trial</a>
            </div>
            <div className="footer-col">
              <h4>Modules</h4>
              <a href="#">Raw Materials</a>
              <a href="#">Production</a>
              <a href="#">Dispatch</a>
              <a href="#">Reports</a>
              <a href="#">Audit Logs</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="mailto:support@packivo.com">Support</a>
              <a href="mailto:sales@packivo.com">Sales</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2025 Packivo ERP. All rights reserved. Made with ❤ for Indian manufacturers.</span>
            <div className="footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
