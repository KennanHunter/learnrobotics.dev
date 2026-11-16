import { FirstCopyright } from "~/components/FIRST/FIRST";
import { localizeHref } from "~/paraglide/runtime";

export function Footer() {
  return (
    <footer class="mx-auto mt-16 max-w-6xl border-t border-background-offset px-8 py-6 space-y-4">
      <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-foreground-muted">
        <span>Issues or questions?</span>
        <FooterLink href="mailto:questions@kennan.dev">
          questions@kennan.dev
        </FooterLink>
        <span>·</span>
        <FooterLink href="https://github.com/KennanHunter/learnrobotics.dev/issues">
          open an issue
        </FooterLink>
        <span>·</span>
        <FooterLink href={localizeHref("/discord")}>
          join the Discord
        </FooterLink>
      </div>
      <FirstCopyright class="text-xs text-foreground-subtle" />
      <p class="text-xs text-foreground-subtle">
        Lesson content is CC BY-NC-SA 4.0. Starter code is MIT-0. The
        platform is PolyForm Noncommercial 1.0.0. See{" "}
        <FooterLink href={localizeHref("/about")}>About</FooterLink> for
        the full text and why it's licensed this way.
      </p>
    </footer>
  );
}

function FooterLink(props: { href: string; children: string }) {
  return (
    <a
      href={props.href}
      class="underline underline-offset-4 hover:text-primary"
    >
      {props.children}
    </a>
  );
}
