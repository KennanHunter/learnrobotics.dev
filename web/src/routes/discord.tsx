import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { AiFillDiscord } from "solid-icons/ai/AiFillDiscord";
import { FIRST } from "~/components/FIRST/FIRST";
import { Footer } from "~/components/Footer/Footer";
import { TopBar } from "~/components/TopBar/TopBar";
import { m } from "~/paraglide/messages";

const JOIN_URL = "https://kennan.dev/lrd-discord";
const DISCORD_TERMS_URL = "https://discord.com/terms";
const DISCORD_PRIVACY_URL = "https://discord.com/privacy";

export const Route = createFileRoute("/discord")({
  component: DiscordPage,
});

function DiscordPage() {
  const [acknowledged, setAcknowledged] = createSignal(false);

  return (
    <>
      <TopBar />
      <main>
        <div class="mx-auto max-w-2xl space-y-8 px-8 py-12">
          <section class="space-y-3">
            <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
              {m.discord_heading()}
            </h1>
            <p class="text-foreground-muted">
              {m.discord_adults_only_prefix()}
              <FIRST />
              {m.discord_adults_only_suffix()}
            </p>
            <p class="text-foreground-muted">
              {m.discord_contact_prefix()}
              <ExternalLink href={`mailto:${m.discord_contact_email()}`}>
                {m.discord_contact_email()}
              </ExternalLink>
              {m.discord_contact_suffix()}
            </p>
          </section>

          <section class="rounded-lg border border-background-offset p-8">
            <div class="flex items-start gap-5">
              <AiFillDiscord
                aria-hidden="true"
                class="shrink-0 text-5xl text-[#5865F2]"
              />
              <div class="flex-1 space-y-4">
                <h2 class="text-xl font-semibold tracking-tight">
                  {m.discord_gate_heading()}
                </h2>
                <label class="flex items-start gap-3 text-sm text-foreground-muted">
                  <input
                    type="checkbox"
                    checked={acknowledged()}
                    onInput={(e) => setAcknowledged(e.currentTarget.checked)}
                    class="mt-1 shrink-0"
                  />
                  <span>{m.discord_gate_adult_check()}</span>
                </label>
                <Show
                  when={acknowledged()}
                  fallback={
                    <p class="text-sm text-foreground-subtle">
                      {m.discord_gate_locked()}
                    </p>
                  }
                >
                  <a
                    href={JOIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-block rounded-md bg-[#5865F2] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]/50"
                  >
                    {m.discord_join_cta()}
                  </a>
                </Show>
              </div>
            </div>
          </section>

          <p class="text-sm text-foreground-subtle">
            {m.discord_third_party_prefix()}
            <ExternalLink href={DISCORD_TERMS_URL}>
              {m.discord_third_party_terms()}
            </ExternalLink>
            {m.discord_third_party_middle()}
            <ExternalLink href={DISCORD_PRIVACY_URL}>
              {m.discord_third_party_privacy()}
            </ExternalLink>
            {m.discord_third_party_suffix()}
          </p>
        </div>
        <Footer />
      </main>

      {/*
        The full student-facing layout (YPP sentence, who's in the server,
        rules list, reporting section, parent/COC links, school-network
        note) is parked here until the server is actually ready to admit
        students. The paraglide keys for every one of those strings are
        still in `web/messages/{en,pirate}.json`.

        When bringing it back:
          - Swap the adults-only paragraph for discord_who_body + the YPP
            paragraph.
          - Add back the rules section (discord_rule_* keys).
          - Add back the reporting section (discord_report_* keys) once
            there's actually a modmail / reporting channel to point to.
          - Swap the gate checkbox from discord_gate_adult_check to
            discord_gate_check.
          - Restore the school-network note (discord_school_network).
      */}
    </>
  );
}

function ExternalLink(props: { href: string; children: string }) {
  const isExternal = /^https?:/.test(props.href);
  return (
    <a
      href={props.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      class="underline underline-offset-4 hover:text-primary"
    >
      {props.children}
    </a>
  );
}
