import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Why I Made This - The Fishbowl',
  description: 'The story behind The Fishbowl: why watching AIs think matters, and how a focus group simulator became a tool I actually use.',
};

export default function AboutPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-deep)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'fixed',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(ellipse, rgba(196,154,42,0.05) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Navigation */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(17, 16, 16, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(61, 54, 50, 0.5)',
        }}
      >
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '10px',
              letterSpacing: '0.08em',
              color: 'var(--accent-gold)',
              textDecoration: 'none',
            }}
          >
            &larr; THE FISHBOWL
          </Link>
          <Link
            href="/setup"
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '9px',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              border: '1px solid var(--dark-border)',
              borderRadius: '4px',
              padding: '5px 12px',
            }}
          >
            START A SESSION
          </Link>
        </div>
      </nav>

      {/* Article content */}
      <article
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '60px 24px 80px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: '56px' }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--accent-gold)',
              marginBottom: '20px',
              opacity: 0.7,
            }}
          >
            MARCH 2026
          </div>
          <h1
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
              lineHeight: 1.2,
              color: 'var(--text-primary)',
              marginBottom: '24px',
              letterSpacing: '0.02em',
            }}
          >
            Why I Made This
          </h1>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              maxWidth: '560px',
            }}
          >
            The Fishbowl started as a thing I built for myself. I kept using it. Then I figured other people might want to use it too.
          </p>
          {/* Gold rule */}
          <div
            style={{
              width: '60px',
              height: '2px',
              background: 'linear-gradient(90deg, var(--accent-gold), transparent)',
              marginTop: '32px',
            }}
          />
        </header>

        {/* --- SECTION 1: The thing that started it --- */}
        <section style={{ marginBottom: '64px' }}>
          <h2
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '14px',
              letterSpacing: '0.06em',
              color: 'var(--accent-gold)',
              marginBottom: '20px',
            }}
          >
            01 / THE THING THAT STARTED IT
          </h2>

          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              In 2023, Stanford released a paper called <a href="https://arxiv.org/pdf/2304.03442" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>Generative Agents</a>{' '}where they put 25 AI characters in a virtual town and let them live their lives. They went to work, had conversations, threw parties, formed opinions about each other. It wasn&apos;t a chatbot. It was a world. I watched the demo video probably ten times.
            </p>
            <p style={{ marginBottom: '16px' }}>
              What stuck with me wasn&apos;t the technology. It was the feeling.
            </p>
          </div>

          {/* Generative Agents paper screenshot */}
          <div
            style={{
              margin: '36px 0',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--dark-border)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/generativeagents.png"
              alt="Screenshot from the Stanford Generative Agents paper"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>

          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              I was watching AI characters interact with each other and I could see them thinking through problems, changing their minds, building on what someone else said. It made AI feel alive in a way that typing into a chat window never does.
            </p>
            <p style={{ marginBottom: '16px' }}>
              It also showed me that these little fake beings could be asked to take on roles and suddenly had little fake goals and opinions about each other.
            </p>
            <p style={{ marginBottom: '16px' }}>
              I kept thinking: why isn&apos;t anyone building more of this?
            </p>
          </div>
        </section>

        {/* --- SECTION 2: Watching them think --- */}
        <section style={{ marginBottom: '64px' }}>
          <h2
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '14px',
              letterSpacing: '0.06em',
              color: 'var(--accent-gold)',
              marginBottom: '20px',
            }}
          >
            02 / WATCHING THEM THINK
          </h2>

          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              Then thinking models happened. Claude started showing its reasoning. You could watch it work through a problem step by step, weigh tradeoffs, change its mind halfway through a thought. It wasn&apos;t just giving you an answer anymore. It was showing you how it got there.
            </p>
            <p style={{ marginBottom: '16px' }}>
              It was kind of <em>arguing with itself</em> in real time until it got an answer it was satisfied with.
            </p>
            <p style={{ marginBottom: '16px' }}>
              I happened across the <a href="https://claude.ai/claude-code" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>Claude Code</a>{' '}/agents skill which spins up a small team of agents to knock out a variety of work tasks simultaneously.
            </p>
            <p style={{ marginBottom: '16px' }}>
              It&apos;s remarkable for getting work done fast but then, in a weird moment, I asked the agents to form a little focus group to give me feedback. And it worked!
            </p>
            <p style={{ marginBottom: '16px' }}>
              Something changes when you personify the AI thinking process. When you can see one AI push back on another AI&apos;s reasoning, it stops being a magic trick and starts being a tool you can actually understand and actually use.
            </p>
            <p style={{ marginBottom: '16px' }}>
              The Fishbowl is my attempt to make that visible. Not the raw chain-of-thought, but the effect of it: four distinct experts with different perspectives, reacting to each other in real time, building on and challenging each other&apos;s points. You&apos;re not reading a response. You&apos;re watching a conversation.
            </p>
          </div>

          {/* Pull quote */}
          <blockquote
            style={{
              margin: '40px 0',
              padding: '0 0 0 24px',
              borderLeft: '3px solid var(--accent-gold)',
            }}
          >
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(1.1rem, 2.2vw, 1.35rem)',
                lineHeight: 1.5,
                color: 'var(--text-primary)',
                fontWeight: 300,
                margin: 0,
              }}
            >
              The gap between what AI can do and what people can see AI doing is enormous. The Fishbowl is my attempt to close it.
            </p>
          </blockquote>
        </section>

        {/* --- SECTION 3: I tried this before --- */}
        <section style={{ marginBottom: '64px' }}>
          <h2
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '14px',
              letterSpacing: '0.06em',
              color: 'var(--accent-gold)',
              marginBottom: '20px',
            }}
          >
            03 / I TRIED THIS BEFORE
          </h2>

          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              The Fishbowl isn&apos;t my first attempt at making AI conversations something you experience.
            </p>
            <p style={{ marginBottom: '16px' }}>
              Last year, I co-founded a company called <a href="https://andthen.chat/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>AndThen</a>{' '}with my friends Kevin Pereira &amp; Rex Sorgatz. We raised pre-seed from a16z through their Speedrun program and built a voice-first platform where you could talk to AI characters in real time. Interactive audio experiences. Games, stories, challenges, all driven by conversation.
            </p>
            <p style={{ marginBottom: '16px' }}>
              The tagline was &ldquo;Play The Conversation&rdquo; and the core idea was that talking with AI should feel like entertainment, not a productivity tool. We built a whole engine for it. Multiple AI agents with distinct personalities, goals, and storylines, and you&apos;re in the middle of it controlling the experience with your voice. Think of it like a podcast you can talk back to.
            </p>
          </div>

          {/* AndThen */}
          <div
            style={{
              margin: '36px 0',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--dark-border)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/about-andthen.jpg"
              alt="Screenshot of AndThen, the voice-first AI conversation platform"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>

          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              The Fishbowl is what happens when you take everything I learned building AndThen and point it at a different problem. Same belief: AI conversations should be interactive, multi-character, and something you watch unfold. Different format: instead of entertainment, it&apos;s a feedback tool. Instead of stories, it&apos;s your ideas getting challenged by a room full of experts. It&apos;s also much smaller and with way less bells and whistles.
            </p>
            <p style={{ marginBottom: '16px' }}>
              We&apos;re still plugging away on <a href="https://andthen.chat/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>AndThen</a>{' '}(voice is an important part of the future of AI!) but the Fishbowl is a little tiny new experiment in a different lane but with echoing ideas.
            </p>
          </div>
        </section>

        {/* --- SECTION 4: Why I think this matters --- */}
        <section style={{ marginBottom: '64px' }}>
          <h2
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '14px',
              letterSpacing: '0.06em',
              color: 'var(--accent-gold)',
              marginBottom: '20px',
            }}
          >
            04 / WHY I THINK THIS MATTERS
          </h2>

          {/* Gavin headshot */}
          <div
            style={{
              float: 'right',
              width: '240px',
              marginLeft: '28px',
              marginBottom: '20px',
              border: '1px solid var(--dark-border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/about-gavin.png"
              alt="Gavin Purcell"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
            <div
              style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--dark-border)',
                fontFamily: "'DM Mono', monospace",
                fontSize: '10px',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                background: 'var(--bg-surface)',
              }}
            >
              Gavin Purcell
            </div>
          </div>

          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              Quick background on me: I&apos;ve spent 20+ years in media. I was a showrunner on The Tonight Show with Jimmy Fallon, won some Emmys, and built a lot of things that tried to make complicated ideas feel simple and fun. These days, I co-host a podcast called <a href="https://aiforhumans.show" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>AI For Humans</a>{' '}where Kevin Pereira and I break down AI for a mainstream audience.
            </p>
            <p style={{ marginBottom: '16px' }}>
              The through-line of my career has always been the same thing: taking something new and foreign that feels inaccessible and making it tangible and additive for regular people.
            </p>
            <p style={{ marginBottom: '16px' }}>
              I&apos;m one of those tech-adjacent people who isn&apos;t a dev but am now coding (via Claude Code) daily. It&apos;s addictive and The Fishbowl is one of those projects that <em>should</em> show people what&apos;s possible to do on your own.
            </p>
            <p style={{ marginBottom: '16px' }}>
              So much of the current world of AI is really about the cutting-edge tools and how developers can push the edge of what&apos;s capable. Not nearly enough people have explored alternative ways to interact with and see the current models, to help people understand how to get more out of them.
            </p>
            <p style={{ marginBottom: '16px' }}>
              I built The Fishbowl because I think the best way for non-devs to understand AI isn&apos;t to read a blog post or watch a Youtube video (please keep doing this tho).
            </p>
            <p style={{ marginBottom: '16px' }}>
              It&apos;s to sit in front of it and watch it work through your problem. Not a generic problem. Your problem. Your startup idea, your marketing plan, your book proposal.
            </p>
            <p style={{ marginBottom: '16px' }}>
              Because when you see four AI experts disagree about something you care about, you stop thinking about AI as a black box and start thinking about it as a team you can direct.
            </p>
          </div>
        </section>

        {/* --- SECTION 5: I actually use this thing --- */}
        <section style={{ marginBottom: '64px' }}>
          <h2
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '14px',
              letterSpacing: '0.06em',
              color: 'var(--accent-gold)',
              marginBottom: '20px',
            }}
          >
            05 / I ACTUALLY USE THIS THING
          </h2>

          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              The part that surprised me most is that I actually use The Fishbowl. Like, regularly. Not just to test it.
            </p>
            <p style={{ marginBottom: '16px' }}>
              When I was building the tool itself, I ran a Fishbowl session on The Fishbowl. I put the product concept in and let the panel tear it apart. They told me the visual scene was more vibe than functional UI (fair), that the API key setup would scare off normal people (also fair), and that the real value was in the conversation dynamics, not the pixel art (annoyingly fair). I changed the roadmap based on that session.
            </p>
            <p style={{ marginBottom: '16px' }}>
              My wife Kim is a published author who runs writing classes for kids. She was working on marketing for her new class lineup and I said &ldquo;just try it.&rdquo; She put her marketing plan into The Fishbowl and got back four different perspectives on her positioning, her pricing, and her messaging. She changed three things based on what the panel said. It took ten minutes.
            </p>
            <p style={{ marginBottom: '16px' }}>
              That&apos;s the moment I knew this was worth sharing. Not because the AI is always right, but because getting four different expert perspectives on your thing in ten minutes is genuinely useful, and most people don&apos;t have access to that. You probably don&apos;t have a VC, a growth expert, a target customer, and a professional skeptic on speed dial. Now you kind of do.
            </p>
            <p style={{ marginBottom: '16px' }}>
              Again, all of this isn&apos;t <em>new</em> but it might open the door to lots of people who&apos;ve never seen something like this before. And that is a huge win.
            </p>
          </div>

          {/* Session screenshot */}
          <div
            style={{
              margin: '36px 0',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--dark-border)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/fishbowlSCREENSHOT.jpg"
              alt="A Fishbowl session in action — four AI panelists debating around the fishbowl table"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        </section>

        {/* --- SECTION 6: It's yours now --- */}
        <section style={{ marginBottom: '64px' }}>
          <h2
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '14px',
              letterSpacing: '0.06em',
              color: 'var(--accent-gold)',
              marginBottom: '20px',
            }}
          >
            06 / IT&apos;S YOURS NOW
          </h2>

          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              The Fishbowl is open source under an MIT license. The whole thing is on <a href="https://github.com/gavinpurcell/the-fishbowl" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>GitHub</a>. You can clone it, run it with your own API key, modify it, build on it, whatever you want. I built it with Claude using <a href="https://claude.ai/claude-code" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>Claude Code</a>{' '}with OpenAI&apos;s <a href="https://openai.com/index/codex/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>Codex</a>{' '}for debugging at times.
            </p>
            <p style={{ marginBottom: '16px' }}>
              If you just want to try it, the hosted version is free up to a certain number of sessions per day. There&apos;s a daily limit because I&apos;m paying for the API out of pocket, but it&apos;s enough to run a real session and see what it does. If you <em>really</em> like it, clone it yourself and have a blast. It&apos;ll run on multiple APIs &amp; local Claude (I think).
            </p>
            <p style={{ marginBottom: '16px' }}>
              And if any of this resonates with you, I&apos;d love to talk. I do fractional executive work helping companies and teams understand AI and figure out how to actually use it. Not in a &ldquo;here&apos;s a slide deck about the future&rdquo; way, but in a &ldquo;let&apos;s build something and see what happens&rdquo; way.
            </p>
            <p style={{ marginBottom: '16px' }}>
              The Fishbowl is a good example of how I think about this stuff.
            </p>
            <p style={{ marginBottom: '16px' }}>
              <a href="https://aiforhumans.show/contact" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>Get in touch</a>{' '}and let&apos;s chat!
            </p>
          </div>
        </section>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--dark-border), transparent)',
            margin: '48px 0',
          }}
        />

        {/* CTA Section */}
        <section
          style={{
            textAlign: 'center',
            padding: '20px 0 40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              alignItems: 'center',
            }}
          >
            {/* Try it CTA */}
            <Link
              href="/setup"
              className="cta-game-button"
              style={{
                fontFamily: "'Silkscreen', monospace",
                fontSize: '12px',
                letterSpacing: '0.08em',
                padding: '14px 32px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Try The Fishbowl
            </Link>

            {/* Links row */}
            <div
              style={{
                display: 'flex',
                gap: '24px',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <a
                href="https://github.com/gavinpurcell/the-fishbowl"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                }}
              >
                GitHub
              </a>
              <span style={{ color: 'var(--dark-border)' }}>/</span>
              <a
                href="https://x.com/gavinpurcell"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                }}
              >
                @gavinpurcell
              </a>
              <span style={{ color: 'var(--dark-border)' }}>/</span>
              <a
                href="https://aiforhumans.show"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                }}
              >
                AI For Humans
              </a>
              <span style={{ color: 'var(--dark-border)' }}>/</span>
              <a
                href="mailto:gavin@gavinpurcell.com"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '12px',
                  color: 'var(--accent-gold)',
                  textDecoration: 'none',
                }}
              >
                gavin@gavinpurcell.com
              </a>
            </div>
          </div>
        </section>

        {/* Footer attribution */}
        <div
          style={{
            textAlign: 'center',
            padding: '24px 0 0',
            borderTop: '1px solid rgba(61, 54, 50, 0.3)',
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            Built by{' '}
            <a
              href="https://gavinpurcell.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}
            >
              Gavin Purcell
            </a>
            , a human &mdash; and{' '}
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}
            >
              Claude
            </a>
            , an AI
          </p>
        </div>
      </article>
    </div>
  );
}
