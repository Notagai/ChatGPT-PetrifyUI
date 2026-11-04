# PetrifyUI DOM compatibility investigation

## What we can and cannot inspect

The public logged-out chatgpt.com page is not the authenticated conversation DOM. The authenticated React view changes with route, viewport and account configuration. The extension now includes a **manual, local** inspector accessible from its popup. It gathers structural selectors, computed CSS, pseudo-element marker styles and the editor's ancestor chain. It never includes message text, typed prompts, input values, URLs or network requests. Its sample limit is three elements per selector.

Use: open an actual conversation with lists, code and the composer visible; open PetrifyUI's popup; click **Inspect active ChatGPT tab**; paste its clipboard report (or copy it from the report textarea). The report has a schema version and a measurement duration. Compare before and after style changes.

## Findings from source audit (not claims of live DOM verification)

- stage.css contains repeated high-specificity overrides for chat prose, code and composer; later declarations can override earlier ones without changing element targeting.
- stage.js and composer.js independently identify the composer by heuristics and assign different markers, so one selector may miss the painted node.
- markFlow scans ancestors and uses broad `[data-pui-flow-shell]` transparent backgrounds, creating risk that non-footer containers are cleared.
- Previous list selectors relied on `[data-pui-main-stage]`, which is not guaranteed to contain all message nodes.
- The old test fixture covers only a sidebar and heading, not actual chat lists, rich response blocks or input ancestry. Thus a passing test is not visual verification.

## Recommended architecture for a reliable extension

1. **Separate layers**: tokens.css (all colors); surfaces.css (sidebar/paper/composer); content.css (lists, code, tables); adapters.js (DOM discovery); diagnostics.js (manual inspector). Remove old contradictory rules when migrating.
2. **Prefer semantic scope**: target conversation-turn and message roles, exact native editor and code elements. Avoid open-ended substring utility matches and styling every div/span.
3. **One composer adapter**: discover the editor once, score bounded ancestors, mark exactly the surface and dock; make both CSS files consume the same markers.
4. **Performance**: CSS for appearance; batched requestAnimationFrame on route or relevant subtree changes; narrowly observed containers, never observing all subtree text changes; use ResizeObserver only for real layout dependencies. Cache markers in WeakMaps where needed and clear on remount.
5. **Future optimizers**: create independent optional modules behind a small scheduler (idle/visible/route hooks) and per-module feature flags. Performance budgets and a safe disable switch must precede new optimizers.
6. **Testing**: build anonymized fixtures from real structural reports; test actual computed bullet marker and code foreground/background, composer dock transparency, contrast and interactions. A screenshot or browser-verified style check is required before saying a visual bug is fixed.

This diagnostic does not collect source HTML or full DOM snapshots; that would risk including the user's conversations. It captures the structural and computed-style facts needed for CSS targeting.
