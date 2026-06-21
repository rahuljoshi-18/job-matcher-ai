'use client';

import { useEffect, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  Binary,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Gauge,
  Lock,
  Network,
  Radar,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
  UsersRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const panelCards = [
  {
    title: 'Admin Panel',
    href: '/sign-in?role=SUPER_ADMIN',
    icon: ShieldCheck,
    accent: 'from-cyan-400 via-blue-500 to-indigo-500',
    ring: 'group-hover:shadow-cyan-500/30',
    description: 'Command the full hiring network with user governance, recruiter verification, AI monitoring, reports, and platform analytics.',
    bullets: ['Manage users and roles', 'Verify recruiters', 'Monitor AI performance'],
  },
  {
    title: 'Recruiter / Company Panel',
    href: '/sign-in?role=RECRUITER',
    icon: Building2,
    accent: 'from-fuchsia-400 via-violet-500 to-blue-500',
    ring: 'group-hover:shadow-fuchsia-500/30',
    description: 'Post roles, rank candidates, inspect resumes, launch AI skill tests, and move applicants through a premium hiring pipeline.',
    bullets: ['AI-ranked candidates', 'Skill comparison charts', 'Hiring pipeline'],
  },
  {
    title: 'Candidate Panel',
    href: '/sign-in?role=CANDIDATE',
    icon: UserRoundSearch,
    accent: 'from-emerald-300 via-teal-400 to-cyan-500',
    ring: 'group-hover:shadow-emerald-500/30',
    description: 'Upload resumes, enrich skills, complete verification tests, track applications, and receive intelligent job recommendations.',
    bullets: ['Resume analysis', 'AI job matches', 'Application tracking'],
  },
];

const features = [
  { icon: FileSearch, title: 'AI Resume Parsing', text: 'Extracts skills, education, experience, certifications, and portfolio signals from candidate profiles.' },
  { icon: Gauge, title: 'ATS Resume Score', text: 'Scores profile completeness, keyword strength, evidence quality, and role readiness.' },
  { icon: Radar, title: 'AI Candidate Ranking', text: 'Ranks best-fit candidates by skills, experience, semantic similarity, and application outcomes.' },
  { icon: ClipboardCheck, title: 'Skill Verification Tests', text: 'Generates focused MCQ assessments from resume skills before recruiter shortlisting.' },
  { icon: Bell, title: 'Real-Time Notifications', text: 'Keeps admins, recruiters, and candidates aligned across reviews, matches, and status changes.' },
  { icon: Lock, title: 'Protected Workspaces', text: 'Role-aware access control keeps platform, company, and candidate data properly separated.' },
];

const workflow = [
  'Resume and job requirements are parsed into structured skill intelligence.',
  'The AI compares evidence, seniority, keywords, and semantic fit across every open role.',
  'Recruiters see ranked matches, gaps, risk flags, test scores, and hiring recommendations.',
];

const proofStats: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: '42k+', label: 'profiles analyzed', icon: UsersRound },
  { value: '91%', label: 'average match precision', icon: BadgeCheck },
  { value: '3.8x', label: 'faster shortlist cycles', icon: Zap },
  { value: '24/7', label: 'platform monitoring', icon: Activity },
];

function scrollToPanels(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();

  const target = document.getElementById('panels');
  if (!target) return;

  const targetTop = target.getBoundingClientRect().top + window.scrollY;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, targetTop);
    window.history.pushState(null, '', '#panels');
    return;
  }

  const startTop = window.scrollY;
  const distance = targetTop - startTop;
  const duration = 500;
  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const easedProgress = progress < 0.5
      ? 4 * progress ** 3
      : 1 - (-2 * progress + 2) ** 3 / 2;

    window.scrollTo(0, startTop + distance * easedProgress);

    if (progress < 1) {
      window.requestAnimationFrame(animate);
    } else {
      window.history.pushState(null, '', '#panels');
    }
  };

  window.requestAnimationFrame(animate);
}

export default function Home() {
  const router = useRouter();
  const { user: clerkUser } = useUser();

  useEffect(() => {
    if (!clerkUser) return;
    router.push('/dashboard');
  }, [clerkUser, router]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <section className="relative min-h-[92vh] px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="ai-grid absolute inset-0 opacity-70" />
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-[420px] w-[420px] rounded-full bg-fuchsia-500/20 blur-3xl" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-violet-500 shadow-lg shadow-cyan-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-wide">Job Matcher AI</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#workflow" className="hover:text-white">AI Workflow</a>
            <a href="#proof" className="hover:text-white">Results</a>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden rounded-full text-slate-100 hover:bg-white/10 hover:text-white sm:inline-flex">
              <a href="#panels" onClick={scrollToPanels}>Sign In</a>
            </Button>
            <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-cyan-100">
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </nav>

        <div className="relative z-10 mx-auto mt-16 max-w-7xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Badge className="mb-6 rounded-full border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-cyan-100 hover:bg-cyan-300/10">
                <Bot className="mr-2 h-4 w-4" />
                AI hiring intelligence for every role
              </Badge>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
                Job Matcher AI
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                A premium recruitment operating system where admins govern the platform, recruiters discover verified talent, and candidates receive intelligent job matches powered by resume analysis and skill validation.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 text-white shadow-lg shadow-cyan-500/25 hover:opacity-95">
                  <Link href="/sign-up">
                    Launch Platform
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <a href="#panels" onClick={scrollToPanels}>Explore Panels</a>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="dashboard-glow rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-2xl">
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">AI Match Engine</p>
                      <h2 className="text-2xl font-semibold">Live Hiring Graph</h2>
                    </div>
                    <Badge className="rounded-full bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">Operational</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ['98%', 'Resume Parse'],
                      ['91%', 'Match Quality'],
                      ['24ms', 'Ranking Latency'],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                        <div className="text-2xl font-semibold">{value}</div>
                        <div className="text-xs text-slate-400">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      ['Senior React Engineer', 'Aarav Sharma', 96, 'Verified'],
                      ['AI Product Analyst', 'Maya Iyer', 92, 'Test passed'],
                      ['Node Platform Lead', 'Rohan Mehta', 88, 'Skill gap: AWS'],
                    ].map(([role, name, score, status]) => (
                      <div key={String(name)} className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.08] to-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-sm text-slate-400">{role}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-semibold text-cyan-200">{score}%</p>
                            <p className="text-xs text-slate-400">{status}</p>
                          </div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400" style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="panels" className="relative px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-200">Role Systems</p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Three intelligent command centers</h2>
            </div>
            <p className="max-w-xl text-slate-400">
              Each panel is designed for a different workflow, with role-aware dashboards, analytics, protected routes, and AI-powered decision support.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {panelCards.map((panel) => {
              const Icon = panel.icon;
              return (
                <article key={panel.title} className={`group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl transition duration-500 hover:-translate-y-2 ${panel.ring} hover:shadow-2xl`}>
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${panel.accent}`} />
                  <div className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${panel.accent} opacity-20 blur-2xl transition group-hover:opacity-40`} />
                  <div className="relative">
                    <div className={`mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${panel.accent} shadow-lg`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold">{panel.title}</h3>
                    <p className="mt-4 min-h-24 text-sm leading-6 text-slate-300">{panel.description}</p>
                    <div className="mt-6 space-y-3">
                      {panel.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-center gap-3 text-sm text-slate-200">
                          <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                          {bullet}
                        </div>
                      ))}
                    </div>
                    <Button asChild className={`mt-8 w-full rounded-full bg-gradient-to-r ${panel.accent} text-white shadow-lg`}>
                      <Link href={panel.href}>
                        Enter Panel
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-violet-200">Advanced Features</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Everything a modern AI hiring platform needs</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur transition hover:border-cyan-300/40 hover:bg-white/[0.08]">
                  <Icon className="h-6 w-6 text-cyan-200" />
                  <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-200">AI Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Smart mediation between talent and teams</h2>
            <p className="mt-5 text-slate-400">
              The AI layer interprets both sides of the marketplace, then turns noisy resumes and job descriptions into clear fit signals.
            </p>
          </div>
          <div className="space-y-4">
            {workflow.map((item, index) => (
              <div key={item} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-300/10 text-cyan-100">{index + 1}</span>
                <p className="pt-2 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-emerald-500/10 p-6 sm:p-8">
          <div className="grid gap-5 md:grid-cols-4">
            {proofStats.map(({ value, label, icon: Icon }) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 text-center">
                <Icon className="mx-auto mb-3 h-6 w-6 text-cyan-200" />
                <p className="text-3xl font-semibold">{value}</p>
                <p className="mt-1 text-sm text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-10 text-sm text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <Binary className="h-5 w-5 text-cyan-200" />
            <span>Job Matcher AI</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/sign-in" className="hover:text-white">Login</Link>
            <span className="flex items-center gap-2"><Network className="h-4 w-4" /> AI recruiting OS</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
