# Agent skills

Vendored from [antfu/skills](https://github.com/antfu/skills) (MIT, © Anthony Fu),
at commit `a74f281` (2026-06-23). Copies, not a submodule, so a clone gets them
without an extra fetch step and so pinning is explicit.

`.claude/skills` is a symlink to this directory — Claude Code reads skills from
there, while `.agents/` keeps them agent-agnostic for any other tool that looks
for them.

Only the skills this project can actually use are here. Deliberately absent:
`nuxt`, `nitro`, `pinia`, `slidev`, `turborepo`, `vitepress`, `vue-router-best-practices`
(none of those are dependencies), `unocss` and `antfu-design` (the styling is
plain CSS with custom properties), `vueuse-functions` (positioning is
`@floating-ui/dom` directly), and `tsdown` (the library is built by Vite in lib
mode with `vite-plugin-dts`).

To refresh, re-copy the directories and update the commit above:

    git clone --depth 1 https://github.com/antfu/skills.git /tmp/antfu-skills
    cp -R /tmp/antfu-skills/skills/<name> .agents/skills/
