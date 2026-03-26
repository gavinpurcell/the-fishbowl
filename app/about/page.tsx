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
            The Fishbowl started as a thing I built for myself. I kept using it. Then I figured other people might want to use it too. Here&apos;s the story.
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

        {/* --- SECTION 1: Watching AIs interact --- */}
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
              In 2023, Stanford released a paper called Generative Agents where they put 25 AI characters in a virtual town and let them live their lives. They went to work, had conversations, threw parties, formed opinions about each other. It wasn&apos;t a chatbot. It was a world. I watched the demo video probably ten times.
            </p>
            <p style={{ marginBottom: '16px' }}>
              What stuck with me wasn&apos;t the technology. It was the feeling. I was watching AI characters interact with each other and I could see them thinking through problems, changing their minds, building on what someone else said. It made AI feel alive in a way that typing into a chat window never does.
            </p>
            <p style={{ marginBottom: '16px' }}>
              That feeling never left. I kept thinking: why isn&apos;t anyone building more of this? Most AI products give you a text box and a response. One input, one output. But the interesting stuff happens when you put multiple perspectives in a room and let them argue.
            </p>
          </div>

          {/* PHOTO PLACEHOLDER: AI Town / Stanford paper screenshot or Gavin's reaction */}
          <div
            style={{
              margin: '36px 0',
              background: 'var(--bg-surface)',
              border: '1px solid var(--dark-border)',
              borderRadius: '8px',
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                }}
              >
                PHOTO
              </div>
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  opacity: 0.5,
                }}
              >
                Screenshot of AI Town or the Stanford Generative Agents paper
              </div>
            </div>
            {/* Corner fold */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '24px',
                height: '24px',
                background: 'linear-gradient(225deg, var(--bg-deep) 50%, var(--dark-border) 50%)',
              }}
            />
          </div>
        </section>

        {/* --- SECTION 2: Thinking models --- */}
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
              That changed everything for me. The gap between what AI can do and what people can see AI doing is enormous. Most people interact with AI through a text box and they get back a confident paragraph. They have no idea what&apos;s happening underneath. But when you can watch the thinking process play out, when you can see one AI push back on another AI&apos;s reasoning, it stops being a magic trick and starts being a tool you can actually understand and trust.
            </p>
            <p style={{ marginBottom: '16px' }}>
              The Fishbowl is my attempt to make that visible. Not the raw chain-of-thought (that&apos;s for developers), but the effect of it: four distinct experts with different perspectives, reacting to each other in real time, building on and challenging each other&apos;s points. You&apos;re not reading a response. You&apos;re watching a conversation.
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

        {/* --- SECTION 3: Background / why this matters --- */}
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
            03 / WHY I THINK THIS MATTERS
          </h2>

          {/* PHOTO PLACEHOLDER: Gavin headshot or working */}
          <div
            style={{
              float: 'right',
              width: '240px',
              marginLeft: '28px',
              marginBottom: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--dark-border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                aspectRatio: '3/4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  PHOTO
                </div>
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    opacity: 0.5,
                    padding: '0 12px',
                  }}
                >
                  Headshot or a photo of you at a speaking event / on set
                </div>
              </div>
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--dark-border)',
                fontFamily: "'DM Mono', monospace",
                fontSize: '10px',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
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
              Quick background on me: I&apos;ve spent 20+ years in media. I was a showrunner on The Tonight Show with Jimmy Fallon, led digital teams at Vox Media and G4, won some Emmys, and built a lot of things that tried to make complicated ideas feel simple and fun. These days I co-host a podcast called AI For Humans where Kevin Pereira and I break down AI for a mainstream audience.
            </p>
            <p style={{ marginBottom: '16px' }}>
              The through-line of my career has always been the same thing: taking something that feels inaccessible and making it tangible for people. Late night TV did that with celebrity culture. Digital media did that with internet culture. And now AI needs someone to do it too, because right now the people building AI and the people who could benefit from it are speaking completely different languages.
            </p>
            <p style={{ marginBottom: '16px' }}>
              I built The Fishbowl because I think the best way to understand AI isn&apos;t to read about it or watch a demo video. It&apos;s to sit in front of it and watch it work through your problem. Not a generic problem. Your problem. Your startup idea, your marketing plan, your book proposal. When you see four AI experts disagree about something you care about, you stop thinking about AI as a black box and start thinking about it as a team you can direct.
            </p>
          </div>
        </section>

        {/* --- SECTION 4: Actually using it --- */}
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
            04 / I ACTUALLY USE THIS THING
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
              My wife Kim is a published author who runs writing classes for kids. She was working on marketing for her new class lineup and I said &quot;just try it.&quot; She put her marketing plan into The Fishbowl and got back four different perspectives on her positioning, her pricing, and her messaging. She changed three things based on what the panel said. It took ten minutes.
            </p>
            <p style={{ marginBottom: '16px' }}>
              That&apos;s the moment I knew this was worth sharing. Not because the AI is always right, but because getting four different expert perspectives on your thing in ten minutes is genuinely useful, and most people don&apos;t have access to that. You probably don&apos;t have a VC, a growth expert, a target customer, and a professional skeptic on speed dial. Now you kind of do.
            </p>
          </div>

          {/* PHOTO PLACEHOLDER: Two side by side - Fishbowl session screenshot + Kim using it */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              margin: '36px 0',
            }}
          >
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--dark-border)',
                borderRadius: '8px',
                aspectRatio: '4/3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  PHOTO
                </div>
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    opacity: 0.5,
                  }}
                >
                  Screenshot of a Fishbowl session in action
                </div>
              </div>
            </div>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--dark-border)',
                borderRadius: '8px',
                aspectRatio: '4/3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  PHOTO
                </div>
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    opacity: 0.5,
                  }}
                >
                  Screenshot of session results / summary page
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 5: Open source / get in touch --- */}
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
            05 / IT&apos;S YOURS NOW
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
              The Fishbowl is open source under an MIT license. The whole thing is on GitHub. You can clone it, run it with your own API key, modify it, build on it, whatever you want. I built it with Claude (the AI, not a person named Claude) using Claude Code, and the entire conversation history of building this thing is probably more interesting than the code itself.
            </p>
            <p style={{ marginBottom: '16px' }}>
              If you just want to try it, the hosted version is free. There&apos;s a daily limit because I&apos;m paying for the API out of pocket, but it&apos;s enough to run a real session and see what it does.
            </p>
            <p style={{ marginBottom: '16px' }}>
              And if any of this resonates with you, I&apos;d love to talk. I do consulting work helping companies and teams understand AI and figure out how to actually use it. Not in a &quot;here&apos;s a slide deck about the future&quot; way, but in a &quot;let&apos;s build something and see what happens&quot; way. The Fishbowl is a good example of how I think about this stuff.
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
