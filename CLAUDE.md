# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DOM Selector Copy — a minimal Chrome Extension (Manifest V3) that lets users input a CSS selector, queries the current page's DOM via `querySelectorAll`, extracts text from matched elements, and copies the results to clipboard.

## Development

No build step, bundler, or test framework. Load the extension directly in Chrome:

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

## Architecture

Two-component message-passing design:

- **popup.js / popup.html** — Extension popup UI. Sends `QUERY_SELECTOR` messages to the active tab's content script via `chrome.tabs.sendMessage`. Stores last results for copy.
- **content.js** — Content script injected on all URLs. Listens for `QUERY_SELECTOR` messages, runs `document.querySelectorAll(selector)`, maps matched elements to their `innerText`/`textContent`, filters empty strings, and returns the array.

Message contract: `{ type: "QUERY_SELECTOR", selector: string }` → response is `string[]`.

## Permissions

`activeTab`, `scripting`, `clipboardWrite` — declared in [manifest.json](manifest.json).
