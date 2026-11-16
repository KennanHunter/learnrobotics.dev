<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./logos/learnrobotics.dev-dark.svg" />
    <img src="./logos/learnrobotics.dev-light.svg" alt="learnrobotics.dev" width="400" />
  </picture>
</p>

<p align="center">
  <a href="https://learnrobotics.dev">learnrobotics.dev</a> · preview at <a href="https://preview.learnrobotics.dev">preview.learnrobotics.dev</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-PolyForm_NC_1.0.0-blue?style=for-the-badge" alt="License: PolyForm NC 1.0.0" />
  <img src="https://img.shields.io/badge/rust-%23000000.svg?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white" alt="WebAssembly" />
  <img src="https://img.shields.io/badge/SolidJS-2C4F7C?style=for-the-badge&logo=solid&logoColor=white" alt="SolidJS" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge" alt="PRs welcome" />
</p>

This is a in development project for teaching FIRST programming

<p align="center">
  <a href="https://kennan.dev/lrd-discord">
    <img src="https://img.shields.io/badge/Join-Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join our Discord" />
  </a>
</p>

# Development

## Requirements

- [Rust](https://www.rust-lang.org/tools/install) (with the `wasm32-wasip2` target: `rustup target add wasm32-wasip2`)
- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/installation)
- [just](https://github.com/casey/just#installation)
- [Git](https://git-scm.com/downloads) (with submodule support)
- [ImageMagick](https://imagemagick.org/download/) (for logo generation)

## Cloning

```sh
git clone git@github.com:KennanHunter/learnrobotics.dev.git
```

If you clone without recursive, run

```sh
git submodule init
```

## Building

```sh
just # builds all our dependencies
just dev # runs a dev server on localhost:5173
```

# Contributing

Contributions welcome! Approved changes will need to sign a CLA. Make an issue and describe what you're working before you put in too much work.

## Translation

The biggest need we have is translations, particularly for languages often used in FIRST such as: Spanish, Portuguese, Turkish, Simplified Chinese, and Romanian. Please don't use machine translation.

## AI

LLM Agents are allowed, but you gotta understand the code and be transparent about usage.

Exactly how much slop is allowed will change depending on page, ex: the compiler has to be solid, some random frontend page doesn't.

# Licensing

Just want your students to use `learnrobotics.dev`? Go ahead, even for a paid camp or class. Licensing only matters if you want to **copy, adapt, or host** our content or code yourself.

- **No license needed:** using the site with students (camps, teams, classes), or linking to any lesson
- **Free with credit (noncommercial):** copying or adapting lessons for things like team training docs or class handouts. Credit us and share your version under the same license:
  > Adapted from [learnrobotics.dev](https://learnrobotics.dev), licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- **Commercial license needed:** hosting your own paid, subscription, or ad-supported instance, or using our content in a paid product (book, paid course, etc.)

Doing something we'd probably get behind, like a nonprofit program, community event, or FIRST outreach? Reach out to `licensing@kennan.dev` and we'll work something out, most likely for free. Same address for questions or commercial licenses.

## Your code is yours

You own the code you write on learnrobotics.dev. Use it on your robot, share it, open-source it, whatever you want. Starter code we provide is MIT-0, so mixing it into your project is no problem.

_Summaries below; the files in [LICENSES](./LICENSES) are what actually count._

## Content: [CC BY-NC-SA 4.0](./LICENSES/CC-BY-NC-SA-4.0.txt)

Lesson text, audio, and video. Share, translate, and remix freely as long as you give credit, don't use it commercially, and share your version under the same license. Embedded third-party videos (like YouTube match footage) belong to their owners.

## Code examples: [MIT-0](./LICENSES/MIT-0.txt)

Starter code and examples. Use them in your robot however you like, no credit needed!

<!--Some starter code is adapted from the WPILib examples and stays under WPILib's [BSD-3-Clause](./LICENSES/BSD-3-Clause.txt) license. Those files are marked.-->

## Platform code: [PolyForm Noncommercial 1.0.0](./LICENSE)

Anyone can run a free, noncommercial instance, including robotics teams, schools, and nonprofits, since the license allows use by any _"charitable organization, educational institution, [...] or government institution [...] regardless of the source of funding."_ Want to host it? Great! Reach out to `contact@kennan.dev` for help anytime.

Making money off it (paid, subscription, or ad-supported) requires a license.
