import { Show } from "solid-js";

function extractId(input: string): string | null {
  if (/^[\w-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1) || null;
    }
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const m = url.pathname.match(/^\/(embed|shorts)\/([\w-]{11})/);
      if (m) return m[2] ?? null;
    }
  } catch {
    /* not a URL, fall through */
  }
  return null;
}

export function YouTube(props: {
  /** Full YouTube URL, youtu.be short link, or bare 11-char video id. */
  video: string;
  /** Accessible title for the iframe. */
  title?: string;
  /** Start playback at this many seconds. */
  start?: number;
}) {
  const id = () => extractId(props.video);
  const src = () => {
    const base = `https://www.youtube-nocookie.com/embed/${id()}`;
    return props.start ? `${base}?start=${Math.floor(props.start)}` : base;
  };

  return (
    <Show
      when={id()}
      fallback={
        <div class="not-prose my-4 rounded border border-background-offset bg-background-offset/40 p-3 text-xs text-foreground-muted">
          Could not parse YouTube video id from <code>{props.video}</code>.
        </div>
      }
    >
      <div class="not-prose my-6 overflow-hidden rounded border border-background-offset">
        <div class="relative aspect-video w-full">
          <iframe
            src={src()}
            title={props.title ?? "YouTube video"}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
            class="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </Show>
  );
}
